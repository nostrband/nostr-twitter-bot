const axios = require('axios');
const xml2js = require('xml2js');
const { PrismaClient } = require('@prisma/client');
const { nip19 } = require('nostr-tools');
const { fetchMentionedPubkey } = require('./common');

const prisma = new PrismaClient();

function parseDate(dateString) {
  return new Date(dateString).getTime();
}

function extractIdFromGuid(guid) {
  const match = guid.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

function extractHashtags(text) {
  const regex = /#\w+/g;
  return text.match(regex) || [];
}

function extractUserMentions(text) {
  const regex = /@\w+/g;
  return text.match(regex) || [];
}

async function createEvent(tweet, myScreenName) {
  const url = `https://twitter.com/${myScreenName}/status/${tweet.id_str}`;
  const event = {
    content: tweet.text,
    tags: [
      ['proxy', url, 'web'],
      ['i', `twitter:${tweet.id_str}`],
    ],
  };

  for (const hashtag of tweet.entities.hashtags) {
    event.tags.push(['t', hashtag.text]);
  }

  for (const user of tweet.entities.user_mentions) {
    if (user.id_str === '-1') continue;
    const pubkey = await fetchMentionedPubkey(user.screen_name);
    let link = '';
    if (pubkey)
      link = `nostr:${nip19.nprofileEncode({
        pubkey,
        relays: [OUTBOX_RELAY],
      })}`;
    if (link) event.content = event.content.replace(user.screen_name, link);
  }

  return event;
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
        const text = item.title[0];
        const tweet = {
          id_str: tweetId,
          text: text,
          created_at: parseDate(item.pubDate[0]),
          entities: {
            hashtags: extractHashtags(text).map((tag) => ({
              text: tag.substring(1),
            })),
            user_mentions: extractUserMentions(text).map((mention) => ({
              screen_name: mention.substring(1),
            })),
          },
        };
        tweets.push(tweet);
        const event = await createEvent(tweet, 'user_name');
        console.log(event);
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
