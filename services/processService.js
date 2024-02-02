const { getTweets } = require("./twitterService");
const {
  start: startNostr,
  publishTweetAsNostrEvent,
} = require("./nostrService");

const { prisma } = require("./db");
const { setNextScan } = require("./userService");

async function process() {
  const users = await prisma.username.findMany({
    where: {
      nextScan: {
        lt: new Date(),
      }
    }
  });
  console.log("process users", users.length);
  for (const user of users) {

    // pause before each user
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // connect to proper relays
    console.log("starting for ", user.username);
    if (!(await startNostr(user))) {
      await setNextScan(user.username, 1800);
      continue;
    }

    // get tweets
    console.log("loading tweets for ", user.username);
    const tweets = await getTweets(user.username);
    console.log("got tweets for ", user.username, tweets.length);

    // wait longer if no tweets
    if (!tweets.length) {
      await setNextScan(user.username, 300);
      continue;
    }

    // process tweets
    for (const tweet of tweets) {
      try {
        const eventResult = await publishTweetAsNostrEvent(tweet, user);
        if (!eventResult) throw new Error("Bad tweet");

        await prisma.history.create({
          data: {
            tweetId: tweet.id_str,
            username: user.username,
            timestamp: new Date(),
            eventId: eventResult.id,
          },
        });
      } catch (e) {
        console.error(
          "Failed to publish Nostr event for tweet:",
          tweet.id_str,
          e
        );
      }
    }

    // wait a little if got new tweets
    await setNextScan(user.username, 60);

  }
  setTimeout(process, 1000);
}

module.exports = {
  process,
};
