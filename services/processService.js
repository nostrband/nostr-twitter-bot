const { getTweets } = require('./twitterService');
const {
  start: startNostr,
  publishTweetAsNostrEvent,
} = require('./nostrService');

const { prisma } = require('./db');

async function process() {
  const users = await prisma.username.findMany();
  for (const user of users) {

    console.log('starting for ', user.username);
    if (!await startNostr(user)) continue;

    console.log('loading tweets for ', user.username);
    const tweets = await getTweets(user.username);
    console.log('got tweets for ', user.username, tweets.length);

    // do not start connections if no tweets
    if (!tweets.length) continue;

    for (const tweet of tweets) {
      const eventResult = await publishTweetAsNostrEvent(
        tweet,
        user.username
      );

      if (eventResult) {
        await prisma.history.create({
          data: {
            tweetId: tweet.id_str,
            username: user.username,
            timestamp: new Date(),
            eventId: eventResult.id,
          },
        });
      } else {
        console.error('Failed to publish Nostr event for tweet:', tweet.id_str);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  setTimeout(process, 1000);
}

module.exports = {
  process,
};
