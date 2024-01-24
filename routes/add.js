const express = require('express');
const { addUsername, getUserSecret } = require('../services/userService');
const { connect } = require('../services/nostrService');
const { parseBunkerUrl, fetchMentionedPubkey } = require('../services/common');
const router = express.Router();

router.post('/', async (req, res) => {
  let { username, relays, bunkerUrl } = req.body;

  // normalize
  username = username.toLowerCase();
  console.log({ username, relays, bunkerUrl })
  try {

    const info = parseBunkerUrl(bunkerUrl)
    console.log({ info });
    if (!info) {
      res.status(400).send('Bad bunker url');
      return
    }

    const pubkey = await fetchMentionedPubkey(username);
    console.log({ pubkey });
    if (!pubkey || pubkey !== info.pubkey) {
      res.status(403).send('Bad pubkey');
      return
    } 
    
    const newUser = await addUsername(username, relays, bunkerUrl);
    res.status(200).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }

  // connect to the bunker in bg
  const user = await getUserSecret(username);
  if (user)
    connect(user);

});

module.exports = router;
