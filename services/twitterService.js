const axios = require('axios');
const xml2js = require('xml2js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseDate(dateString) {
  return new Date(dateString).getTime();
}

function extractIdFromGuid(guid) {
  const match = guid.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

async function getTweets(username, nitterUrl = 'https://nitter.moomoo.me') {
  try {
    const response = await axios.get(
      `${nitterUrl}/${username}/with_replies/rss`
    );
    const parser = new xml2js.Parser({ trim: true });
    const result = await parser.parseStringPromise(response.data);
    const items = result.rss.channel[0].item;
    const tweets = [];

    for (const item of items) {
      const tweetId = extractIdFromGuid(item.guid[0]);
      const isAlreadyImported = await prisma.history.findFirst({
        where: {
          tweetId: tweetId,
        },
      });
      if (!isAlreadyImported) {
        tweets.push({
          id_str: tweetId,
          text: item.title[0],
          created_at: parseDate(item.pubDate[0]),
          entities: {
            urls: [],
            user_mentions: [],
          },
        });
      }
    }
    return tweets;
  } catch (error) {
    console.error('Error getting tweets for ', username, error);
    return [];
  }
}

module.exports = {
  getTweets,
};
