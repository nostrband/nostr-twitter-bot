const express = require("express");
const { createHash } = require("node:crypto");
const {
  // updateUsername,
  // getUser,
  upsertUsername,
} = require("../services/userService");
const {
  connect,
  fetchTwitterPubkey,
  isValidVerifyTweet,
} = require("../services/nostrService");
const { parseBunkerUrl } = require("../services/common");
const { generatePrivateKey, nip19 } = require("nostr-tools");
const { getTweet } = require("../services/twitterService");
const router = express.Router();

function digest(algo, data) {
  const hash = createHash(algo);
  hash.update(data);
  return hash.digest("hex");
}

// nip98
async function verifyAuthNostr(req, npub, path) {
  try {
    const { type, data: pubkey } = nip19.decode(npub);
    if (type !== "npub") return false;

    const { authorization } = req.headers;
    //console.log("req authorization", pubkey, authorization);
    if (!authorization.startsWith("Nostr ")) return false;
    const data = authorization.split(" ")[1].trim();
    if (!data) return false;

    const json = atob(data);
    const event = JSON.parse(json);
    // console.log("req authorization event", { event, npub, path });

    const now = Math.floor(Date.now() / 1000);
    if (event.pubkey !== pubkey) return false;
    if (event.kind !== 27235) return false;
    if (event.created_at < now - 60 || event.created_at > now + 60)
      return false;

    const u = event.tags.find((t) => t.length === 2 && t[0] === "u")?.[1];
    const method = event.tags.find(
      (t) => t.length === 2 && t[0] === "method"
    )?.[1];
    const payload = event.tags.find(
      (t) => t.length === 2 && t[0] === "payload"
    )?.[1];
    if (method !== req.method) return false;

    const url = new URL(u);
    console.log({ url })
    if (url.origin !== process.env.ORIGIN || url.pathname !== path)
      return false;

    if (req.rawBody.length > 0) {
      const hash = digest("sha256", req.rawBody.toString());
      // console.log({ hash, payload, body: req.rawBody.toString() })
      if (hash !== payload) return false;
    } else if (payload) {
      return false;
    }

    return true;
  } catch (e) {
    console.log("auth error", e);
    return false;
  }
}

router.post("/", async (req, res) => {
  let { username, relays, bunkerUrl, verifyTweetId, bunkerNsec } = req.body;

  // normalize
  username = username.toLowerCase();
  console.log({ username, relays, bunkerUrl, verifyTweetId });
  try {

    const info = parseBunkerUrl(bunkerUrl);
    console.log({ info });
    if (!info) {
      res.status(400).send("Bad bunker url");
      return;
    }

    const npub = nip19.npubEncode(info.pubkey);
    if (!(await verifyAuthNostr(req, npub, "/add"))) {
      console.log("auth failed", npub);
      res.status(403).send({
        error: `Bad auth`,
      });
      return;
    }

    if (verifyTweetId.startsWith("https://")) {
      verifyTweetId = verifyTweetId
        .split("/status/")[1]
        .split("/")[0]
        .split("?")[0];
    }

    const pubkey = await fetchTwitterPubkey(username);
    console.log({ pubkey });
    if (!pubkey || pubkey !== info.pubkey) {
      if (!verifyTweetId) {
        res.status(401).send("Bad pubkey");
        return;
      }

      const tweet = await getTweet(verifyTweetId);
      if (!tweet) {
        res.status(401).send("Failed to fetch tweet");
        return;
      }

      console.log({ tweet });
      if (!isValidVerifyTweet(tweet, username, info.pubkey)) {
        res.status(401).send("Invalid verification tweet");
        return;
      }
    }

    // connect
    let secretKey;
    if (bunkerNsec) {
      let { type, data } = nip19.decode(bunkerNsec);
      if (type !== "nsec") throw new Error("Bad bunker nsec");
      secretKey = data;
    } else {
      secretKey = generatePrivateKey();
    }
    const user = {
      username,
      relays,
      bunkerUrl,
      secretKey,
    };
    if (!(await connect(user, verifyTweetId))) {
      res.status(405).send("Failed to connect to keys");
      return;
    }

    // upsert, updating the keys
    const result = await upsertUsername(user);
    // } else {

    //   if (!await getUser(username)) {
    //     res.status(400).send("User not found, specify bunker url");
    //     return;
    //   }

    //   // update
    //   result = await updateUsername({
    //     username, relays
    //   });
    // }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
