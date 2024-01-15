const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
const { publishTweetAsNostrEvent } = require('./nostrService');

const prisma = new PrismaClient();

async function getTweets(username) {
  try {
    const response = await axios.get(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`
    );
    const $ = cheerio.load(response.data);
    const scriptContent = $('#__NEXT_DATA__').html();
    const tweetsData = JSON.parse(scriptContent);
    const tweets = tweetsData.props.pageProps.timeline.entries;
    console.log('tweets', tweets.length);
    const newTweets = [];
    for (const entry of tweets) {
      if (entry.type === 'tweet') {
        const tweet = entry.content.tweet;
        const isAlreadyImported = await prisma.history.findFirst({
          where: {
            tweetId: tweet.id_str,
          },
        });
        if (!isAlreadyImported) {
          const mentionedPubkeys = {};
          await publishTweetAsNostrEvent(
            tweet,
            user.secretKey,
            mentionedPubkeys
          );
        }
      }
    }
    return newTweets;
  } catch (error) {
    console.error('Error getting tweets for ', username, error);
    return [];
  }
}

module.exports = {
  getTweets,
};
