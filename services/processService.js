const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { getTweets } = require('./twitterService');
const {
  start: startNostr,
  publishTweetAsNostrEvent,
} = require('./nostrService');

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
    if (error.response.status !== 404)
      console.error('Error fetching mentioned profile', error);
    else console.log('not found nostr acc for', screenName);
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
    await startNostr(user.relays);
    for (const tweet of tweets) {
      const mentionedPubkeys = await fetchMentionedPubkeysForTweet(tweet);
      const eventResult = await publishTweetAsNostrEvent(
        tweet,
        user.secretKey,
        mentionedPubkeys
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
