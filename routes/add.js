const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  // Логика добавления пользователя
  // Доступ к параметрам можно получить через req.body или req.query
});

module.exports = router;
