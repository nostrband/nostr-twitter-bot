const express = require("express");
const { updateUsername, getUser, upsertUsername } = require("../services/userService");
const { connect, fetchTwitterPubkey, isValidVerifyTweet } = require("../services/nostrService");
const { parseBunkerUrl } = require("../services/common");
const { generatePrivateKey } = require("nostr-tools");
const { getTweet } = require("../services/twitterService");
const router = express.Router();

router.post("/", async (req, res) => {
  let { username, relays, bunkerUrl, verifyTweetId } = req.body;

  // normalize
  username = username.toLowerCase();
  console.log({ username, relays, bunkerUrl, verifyTweetId });
  try {
    // const isAuthValid = await verifyNostrAuth(req, '/add');
    // console.log('Is Authorization Valid?', isAuthValid);
    // if (!isAuthValid) {
    //   return res.status(403).send('Forbidden');
    // }

    let result;
    if (bunkerUrl) {
      const info = parseBunkerUrl(bunkerUrl);
      console.log({ info });
      if (!info) {
        res.status(400).send("Bad bunker url");
        return;
      }
  
      const pubkey = await fetchTwitterPubkey(username);
      console.log({ pubkey });
      if (!pubkey || pubkey !== info.pubkey) {
        if (!verifyTweetId) {
          res.status(403).send("Bad pubkey");
          return;  
        }

        const tweet = await getTweet(verifyTweetId);
        if (!tweet) {
          res.status(403).send("Failed to fetch tweet");
          return;  
        }

        console.log({ tweet })
        if (!isValidVerifyTweet(tweet, info.pubkey)) {
          res.status(403).send("Invalid verification tweet");
          return;  
        }
      }
  
      // connect
      const secretKey = generatePrivateKey();
      const user = {
        username, relays, bunkerUrl, secretKey
      };
      if (!await connect(user, verifyTweetId)) {
        res.status(405).send("Failed to connect to keys");
        return;
      }

      // upsert, updating the keys
      result = await upsertUsername(user);
    } else {

      if (!await getUser(username)) {
        res.status(400).send("User not found, specify bunker url");
        return;
      }

      // update
      result = await updateUsername({
        username, relays
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
