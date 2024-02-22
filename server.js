require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const addRoute = require('./routes/add');
const listRoute = require('./routes/list');
const historyRoute = require('./routes/history');
const { process: processTweets } = require('./services/processService');
const { prisma } = require('./services/db');

const app = express();
app.use(cors());

// json middleware that saves the original body for nip98 auth
app.use(
  bodyParser.json({
    verify: function (req, res, buf, encoding) {
      req.rawBody = buf;
    },
  })
);

// app.use(express.json());

app.use('/add', addRoute);
app.use('/list', listRoute);
app.use('/history', historyRoute);

if (process.argv.length >= 3) {
  const cmd = async () => {
    if (process.argv[2] === 'list_users') {
      const users = await prisma.username.findMany({});
      for (const u of users)
        console.log("username", u.username, u.bunkerUrl);
      return;
    }  
  }
  cmd();
  return;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// background processing
processTweets();
