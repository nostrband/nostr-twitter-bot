require("websocket-polyfill");

global.crypto = require("node:crypto");

const {
  default: NDK,
  NDKEvent,
  NDKPrivateKeySigner,
  NDKNip46Signer,
  NDKRelaySet,
} = require("@nostr-dev-kit/ndk");
const { getPublicKey, nip19 } = require("nostr-tools");
const { parseBunkerUrl, fetchMentionedPubkey } = require("./common");
const { formatProfileUrl, formatTweetUrl } = require("./twitterService");
const OUTBOX_RELAY = "wss://relay.nostr.band";
const EXIT_RELAY = "wss://relay.exit.pub";
const RELAYS = [OUTBOX_RELAY, EXIT_RELAY];

// used to query the wider network
const fetchNdk = new NDK({
  explicitRelayUrls: RELAYS,
});
fetchNdk.connect();

// used for publishing to user's relays
let userNdk = null;

// used to talk to the signer
let bunkerNdk = null;
let signer = null;

function releaseNdk(ndk) {
  if (!ndk) return;
  for (const r of ndk.pool.relays.values()) r.disconnect();
}

async function start(user) {
  releaseNdk(userNdk);
  releaseNdk(bunkerNdk);

  const signerNdk = await startSigner(user);
  if (!signerNdk) return false;

  bunkerNdk = signerNdk.ndk;
  signer = signerNdk.signer;

  console.log("user", user.username, "relays", user.relays);
  userNdk = new NDK({
    explicitRelayUrls: user.relays.split(","),
  });
  await userNdk.connect();

  return true;
}

function convertToTimestamp(dateString) {
  const dateObject = new Date(dateString);
  return Math.floor(dateObject.getTime() / 1000);
}

async function fetchTweetEvent(screenName, id) {
  const pubkey = await fetchMentionedPubkey(screenName);
  if (!pubkey) return;
  const tid = `twitter:${id}`;
  const events = await fetchNdk.fetchEvents(
    {
      kinds: [1],
      authors: [pubkey],
      "#x": [tid],
    },
    {},
    NDKRelaySet.fromRelayUrls(RELAYS, fetchNdk)
  );
  return [...events.values()].find((e) =>
    e.tags.find(
      (t) => t.length >= 3 && t[0] === "x" && t[1] === tid && t[2] === "self"
    )
  );
}

async function createEvent(tweet, username) {
  // retweet?
  const isRetweet = tweet.user.screen_name.toLowerCase() !== username;

  // Not supported atm
  if (isRetweet) return undefined;

  const url = formatTweetUrl(tweet.user.screen_name, tweet.id_str);

  const event = {
    content: tweet.text,
    created_at: convertToTimestamp(tweet.created_at),
    tags: [["proxy", url, "web"]],
  };

  // mark oneself so that we could resolve references to this tweet
  event.tags.push(["x", `twitter:${tweet.id_str}`, "self"]);

  const isReply = tweet.in_reply_to_status_id_str;
  if (isReply) {
    // fetch parent tweet on nostr
    const parent = await fetchTweetEvent(
      tweet.in_reply_to_screen_name,
      tweet.in_reply_to_status_id_str
    );

    if (parent) {
      const grandparent = parent.tags.find(
        (t) => t.length >= 4 && t[0] === "e" && t[3] === "root"
      )?.[1];
      if (grandparent)
        event.tags.push(["e", grandparent, OUTBOX_RELAY, "root"]);

      event.tags.push([
        "e",
        parent.id,
        OUTBOX_RELAY,
        grandparent ? "reply" : "root",
      ]);
    } else {
      // no parent tweet on nostr

      // add a marker so that when parent is published
      // we could rebuild the thread
      event.tags.push([
        "x",
        `twitter:${tweet.in_reply_to_status_id_str}`,
        "reply",
      ]);

      // format 'RE url: text' content to make it backward compatible
      // in all nostr clients
      const url = formatTweetUrl(
        tweet.in_reply_to_screen_name,
        tweet.in_reply_to_status_id_str
      );
      event.content = event.content.replace(
        new RegExp(`^@${tweet.in_reply_to_screen_name}( @\\w+)* `, "i"),
        `RE ${url}: `
      );

      // if parent author is on nostr, tag them
      const parentPubkey = await fetchMentionedPubkey(
        tweet.in_reply_to_screen_name
      );
      if (parentPubkey) event.tags.push(["p", parentPubkey]);
    }
  }

  // if (isRetweet) {
  //   // FIXME find the author's nostr profile,
  //   // FIXME find the original note
  //   // FIXME don't put 'i' tag bcs this we don't know the RT's id!
  //   const url = formatTweetUrl(tweet.user.screen_name, tweet.id_str);
  //   text = `RT ${url}: ${text}`
  // }
  // user mentions
  for (const user of tweet.entities.user_mentions) {
    if (user.id_str === "-1") continue;
    const pubkey = await fetchMentionedPubkey(user.screen_name);
    if (pubkey) {
      const link = `nostr:${nip19.nprofileEncode({
        pubkey,
        relays: [OUTBOX_RELAY],
      })}`;
      event.content = event.content.replace(`@${user.screen_name}`, link);
    } else {
      const url = formatProfileUrl(user.screen_name);
      event.content = event.content.replace(`@${user.screen_name}`, url);
    }
  }

  // extend links
  if (tweet.entities.urls.length) {
    for (const url of tweet.entities.urls) {
      event.content = event.content.replace(url.url, url.expanded_url);
    }
  }

  if (tweet.extended_entities?.media) {
    for (const extEntity of tweet.extended_entities?.media) {
      event.content = event.content.replace(
        extEntity.url,
        extEntity.media_url_https
      );
    }
  }

  // NOTE: hashtags are handled by ndk automatically (#tag is
  // processed to add [t, tag])

  return event;
}

async function publishTweetAsNostrEvent(tweet, user) {

  const eventPayload = await createEvent(tweet, user.username);

  // bad event
  if (!eventPayload) return undefined;

  console.log("tweet", tweet);

  const ndkEvent = new NDKEvent(bunkerNdk, {
    pubkey: (await signer.user()).hexpubkey,
    kind: 1,
    ...eventPayload,
  });

  // generate id and convert to signable event
  const event = await ndkEvent.toNostrEvent();
  console.log("signing", event);

  event.sig = await signer.sign(event);
  console.log("signed", event);

  await new NDKEvent(userNdk, event).publish(
    //NDKRelaySet.fromRelayUrls(user.relays.split(",")),
    undefined,
    3000
  );
  console.log("published", ndkEvent.id);

  return ndkEvent.rawEvent();
}

async function wait(fn, time) {
  let timer;
  const promise = new Promise(async (ok, err) => {
    try {
      const r = await fn();
      clearTimeout(timer);
      ok(r);
    } catch (e) {
      err(e);
    }
  });

  const timeout = new Promise((_, err) => {
    timer = setTimeout(() => err(new Error("Timeout")), time);
  });

  return await Promise.race([promise, timeout]);
}

async function startSigner(user, firstConnect = false) {
  const info = parseBunkerUrl(user.bunkerUrl);
  console.log({ info });
  if (!info) return undefined;

  try {
    return await wait(
      async () => {
        const ndk = new NDK({
          explicitRelayUrls: info.relays,
        });
        await ndk.connect();
        console.log("connected to bunker relay", user.bunkerUrl);

        const npub = nip19.npubEncode(info.pubkey);
        const localSigner = new NDKPrivateKeySigner(user.secretKey);
        const signer = new NDKNip46Signer(ndk, npub, localSigner);
        await signer.blockUntilReady();
        console.log("connected to bunker", user.bunkerUrl);

        return {
          signer,
          ndk,
        };
      },
      firstConnect ? 60000 : 3000
    );
  } catch (e) {
    console.log("Failed to connect to", info, e);
    return undefined;
  }
}

async function connect(user) {
  console.log("Test connect");
  const signerNdk = await startSigner(user, true);
  if (!signerNdk) return false;

  let ok = false;
  try {
    await wait(async () => {
      const event = new NDKEvent(signerNdk.ndk, {
        kind: 1,
        content: "Test event to setup signing.",
      });
      event.pubkey = (await signerNdk.signer.user()).hexpubkey;
      console.log("testing signing", event.rawEvent());
      event.sig = await signerNdk.signer.sign(await event.toNostrEvent());
      console.log("signed test event", event.rawEvent());
    }, 60000);

    ok = true;
  } catch (e) {
    console.log("Failed to sign test event", e);
  }

  releaseNdk(signerNdk.ndk);

  // signing is just to make sure user
  // gives all perms at once, but really all
  // we need is connect, so
  // return ok;
  return true;
}

module.exports = {
  start,
  connect,
  publishTweetAsNostrEvent,
};
