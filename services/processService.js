const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { getTweets } = require('./twitterService');
const {
  start: startNostr,
  publishTweetAsNostrEvent,
} = require('./nostrService');

const { fetchMentionedPubkey } = require('./common');

async function fetchMentionedPubkeysForTweet(tweet) {
  let mentionedPubkeys = {};
  const userMentions = tweet.entities.user_mentions;

  for (const user of userMentions) {
    const pubkey = await fetchMentionedPubkey(user.screen_name);
    if (pubkey) {
      mentionedPubkeys[user.screen_name] = pubkey;
    }
  }

  return mentionedPubkeys;
}

async function process() {
  const users = await prisma.username.findMany();
  for (const user of users) {
    console.log('loading tweets for ', user.username);
    const tweets = await getTweets(user.username);
    console.log('got tweets for ', user.username, tweets.length);
    await startNostr(user.relays);
    for (const tweet of tweets) {
      const mentionedPubkeys = await fetchMentionedPubkeysForTweet(tweet);
      const eventResult = await publishTweetAsNostrEvent(
        tweet,
        user.secretKey,
        mentionedPubkeys,
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
  setTimeout(process, 0);
}

module.exports = {
  process,
};
