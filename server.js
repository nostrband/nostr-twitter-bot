require('dotenv').config();
const express = require('express');
const cors = require('cors');
const addRoute = require('./routes/add');
const listRoute = require('./routes/list');
const historyRoute = require('./routes/history');
const { process: processTweets } = require('./services/processService');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/add', addRoute);
app.use('/list', listRoute);
app.use('/history', historyRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
