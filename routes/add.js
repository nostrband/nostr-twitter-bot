const express = require("express");
const { addUsername, getUserSecret, updateUsername, getUser } = require("../services/userService");
const { connect } = require("../services/nostrService");
const { parseBunkerUrl, fetchMentionedPubkey } = require("../services/common");
const { generatePrivateKey } = require("nostr-tools");
const router = express.Router();

router.post("/", async (req, res) => {
  let { username, relays, bunkerUrl } = req.body;

  // normalize
  username = username.toLowerCase();
  console.log({ username, relays, bunkerUrl });
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
  
      const pubkey = await fetchMentionedPubkey(username);
      console.log({ pubkey });
      if (!pubkey || pubkey !== info.pubkey) {
        res.status(403).send("Bad pubkey");
        return;
      }
  
      // connect
      const secretKey = generatePrivateKey();
      const user = {
        username, relays, bunkerUrl, secretKey
      };
      if (!await connect(user)) {
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
