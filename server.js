require('dotenv').config();
const express = require('express');
const addRoute = require('./routes/add');
const listRoute = require('./routes/list');
const historyRoute = require('./routes/history');
const { process: processTweets } = require('./services/processService');

const app = express();
app.use(express.json());

app.use('/add', addRoute);
app.use('/list', listRoute);
app.use('/history', historyRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Запуск процесса импорта твитов
processTweets();
