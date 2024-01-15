const express = require('express');
const { addUsername } = require('../services/userService');
const router = express.Router();

router.post('/', async (req, res) => {
  const { username, relays } = req.body;
  try {
    const newUser = await addUsername(username, relays);
    res.status(200).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
