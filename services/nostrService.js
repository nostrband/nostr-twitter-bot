const {
  default: NDK,
  NDKEvent,
  NDKPrivateKeySigner,
} = require('@nostr-dev-kit/ndk');
const { getPublicKey, nip19 } = require('nostr-tools');
const OUTBOX_RELAY = 'wss://relay.nostr.band';

let ndk = null;

async function start(relays) {
  if (ndk) {
    for (const r of ndk.pool.relays.values()) r.disconnect();
  }

  ndk = new NDK({
    explicitRelayUrls: relays,
  });
}

function convertToTimestamp(dateString) {
  const dateObject = new Date(dateString);
  return Math.floor(dateObject.getTime() / 1000);
}

async function processUserMentions(tweet, mentionedPubkeys) {
  const mentions = [];
  for (const user of tweet.entities.user_mentions) {
    const pubkey = mentionedPubkeys[user.screen_name];
    if (pubkey) {
      const nostrProfileLink = `nostr:${nip19.nprofileEncode({
        pubkey,
        relays: ['wss://relay.nostr.band/'],
      })}`;
      mentions.push({ screenName: user.screen_name, nostrProfileLink });
    }
  }
  return mentions;
}

async function createEvent(tweet, myScreenName, mentionedPubkeys) {
  const url = `https://twitter.com/${myScreenName}/status/${tweet.id_str}`;
  let content = tweet.text;

  for (const hashtag of tweet.entities.hashtags) {
    content += ` #${hashtag.text}`;
  }

  const mentions = await processUserMentions(tweet, mentionedPubkeys);
  mentions.forEach((mention) => {
    content = content.replace(
      `@${mention.screenName}`,
      mention.nostrProfileLink
    );
  });

  for (const user of tweet.entities.user_mentions) {
    if (user.id_str === '-1') continue;
    const pubkey = mentionedPubkeys[user.screen_name];
    let link = '';
    if (pubkey) {
      link = `nostr:${nip19.nprofileEncode({
        pubkey,
        relays: [OUTBOX_RELAY],
      })}`;
      content = content.replace(`@${user.screen_name}`, link);
    }
  }

  return {
    content,
    tags: [
      ['proxy', url, 'web'],
      ['i', `twitter:${tweet.id_str}`],
    ],
  };
}

async function publishTweetAsNostrEvent(
  tweet,
  nostrPrivateKey,
  mentionedPubkeys,
  username
) {
  const signer = new NDKPrivateKeySigner(nostrPrivateKey);
  const pubkey = getPublicKey(nostrPrivateKey);
  const eventPayload = await createEvent(tweet, username, mentionedPubkeys);

  const ndkEvent = new NDKEvent(ndk, {
    pubkey: pubkey,
    created_at: convertToTimestamp(tweet.created_at),
    ...eventPayload,
    kind: 1,
  });

  await ndkEvent.sign(signer);
  console.log('tweet', tweet, 'event', ndkEvent.rawEvent());

  // FIXME publish when we're done formatting the tweets
  // const result = await ndkEvent.publish();
  const result = null; // { id: ndkEvent.id };
  return result;
}

module.exports = {
  start,
  publishTweetAsNostrEvent,
};
