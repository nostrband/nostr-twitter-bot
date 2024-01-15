const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { getTweets } = require('./twitterService');
const { publishTweetAsNostrEvent } = require('./nostrService');

let mentionedPubkeysCache = {};

async function fetchMentionedPubkey(screenName) {
  if (mentionedPubkeysCache[screenName]) {
    return mentionedPubkeysCache[screenName];
  }
  try {
    const response = await axios.get(
      `https://api.nostr.band/v0/twitter_pubkey/${screenName}`
    );
    const body = response.data;
    if (body.twitter_handle === screenName && body.pubkey) {
      mentionedPubkeysCache[screenName] = body.pubkey;
      return body.pubkey;
    }
  } catch (error) {
    console.error('Error fetching mentioned profile', error);
  }

  return null;
}

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

    for (const tweet of tweets) {
      const mentionedPubkeys = await fetchMentionedPubkeysForTweet(tweet);
      const eventResult = await publishTweetAsNostrEvent(
        tweet,
        user.secretKey,
        mentionedPubkeys
      );
      await prisma.history.create({
        data: {
          tweetId: tweet.id_str,
          username: user.username,
          timestamp: new Date(),
          eventId: eventResult.id,
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  setTimeout(process, 0);
}

module.exports = {
  process,
};
