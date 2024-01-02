const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getTweets = require('./twitterService');
const publishTweetAsNostrEvent = require('./nostrService');

async function process() {
  const users = await prisma.username.findMany();
  console.log(users, 'USSEEEERRS');
  for (const user of users) {
    const tweets = await getTweets(user.username);
    for (const tweet of tweets) {
      const eventResult = await publishTweetAsNostrEvent(tweet, user.secretKey);
      await prisma.history.create({
        data: {
          tweetId: tweet.id_str,
          username: user.username,
          timestamp: new Date(),
          eventId: eventResult.id,
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  setTimeout(process, 0);
}

module.exports = {
  process,
};
