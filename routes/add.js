const express = require('express');
const { verifyNostrAuth } = require('../helpers/verifyUser');
const { addUsername } = require('../services/userService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { username, relays } = req.body;
  try {
    const isAuthValid = await verifyNostrAuth(req, '/add');
    console.log('Is Authorization Valid?', isAuthValid);
    if (!isAuthValid) {
      return res.status(403).send('Forbidden');
    }

    const newUser = await addUsername(username, relays);
    res.status(200).json({ ...newUser, message: 'Successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
