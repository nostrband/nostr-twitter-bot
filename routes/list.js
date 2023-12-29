const express = require('express');
const listUsernames = require('../services/userService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const usernames = await listUsernames();
    res.status(200).json(usernames);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
