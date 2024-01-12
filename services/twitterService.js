const axios = require('axios');
const cheerio = require('cheerio');
const { NDKEvent } = require('@nostr-dev-kit/ndk');
const { PrismaClient } = require('@prisma/client');

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

    const newTweets = [];
    for (const entry of tweets) {
      if (entry.type === 'tweet') {
        const tweet = entry.content.tweet;
        const isAlreadyImported = await prisma.history.findFirst({
          where: {
            tweetId: tweet.id,
          },
        });
        if (!isAlreadyImported) {
          const nostrEvent = new NDKEvent();
          nostrEvent.content = tweet.full_text || tweet.text;
          nostrEvent.kind = 1;
          nostrEvent.created_at = new Date(tweet.created_at).getTime() / 1000;
          nostrEvent.tags = [['i', `twitter:${tweet.id}`]];
          newTweets.push(nostrEvent);
        }
      }
    }

    return newTweets;
  } catch (error) {
    console.error('Ошибка при получении твитов:', error);
    return [];
  }
}

module.exports = {
  getTweets,
};
