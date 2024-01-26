const express = require('express');
const { getHistory } = require("../services/historyService");
const router = express.Router();

router.get('/', async (req, res) => {
  const { username } = req.query;
  try {
    const history = await getHistory(username);
    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
