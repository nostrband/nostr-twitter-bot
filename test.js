const axios = require('axios');
const cheerio = require('cheerio');

const { NDKEvent } = require('@nostr-dev-kit/ndk');

async function getTweets(username) {
  try {
    // Запрос к Twitter для получения HTML страницы
    const response = await axios.get(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`
    );
    const $ = cheerio.load(response.data);

    // Извлечение JSON данных из HTML
    const scriptContent = $('#__NEXT_DATA__').html();
    const tweetsData = JSON.parse(scriptContent);
    const tweets = tweetsData.props.pageProps.timeline.entries;

    // Преобразование каждого твита в объект события Nostr
    return tweets
      .map((entry) => {
        if (entry.type === 'tweet') {
          const tweet = entry.content.tweet;
          const nostrEvent = new NDKEvent();
          nostrEvent.content = tweet.full_text || tweet.text;
          nostrEvent.kind = 1;
          nostrEvent.created_at = new Date(tweet.created_at).getTime() / 1000;
          nostrEvent.tags = [['i', `twitter:${tweet.id}`]];

          return nostrEvent;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Ошибка при получении твитов:', error);
    return [];
  }
}
async function showToConsoleData() {
  let result = await getTweets('kloopnews');
  console.log(result, 'RESUULT');
}

showToConsoleData();
