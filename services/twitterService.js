const axios = require("axios");
const xml2js = require("xml2js");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseDate(dateString) {
  return new Date(dateString).getTime();
}

function extractIdFromGuid(guid) {
  const match = guid.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

function extractAuthorFromGuid(guid) {
  const match = guid.match(/\/(\w+)\/status/);
  return match ? match[1] : null;
}

function extractParentAuthorFromText(text) {
  const match = text.match(/R to @(\w+):/);
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

function formatTweetUrl(username, id) {
  return `https://twitter.com/${username}/status/${id}`;
}

async function getTweets(username, nitterUrl = "https://nitter.moomoo.me") {
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
      const author = extractAuthorFromGuid(item.guid[0]);
      const isAlreadyImported = await prisma.history.findFirst({
        where: {
          tweetId: tweetId,
        },
      });
      if (!isAlreadyImported) {
        let text = item.title[0];

        const RT = `RT by @${username}`;
        if (author != username && text.startsWith(RT)) {
          text = text.replace(RT, `RT @${author}`);
        }

        const replyTo = extractParentAuthorFromText(text);
        if (replyTo) {
          // some magic
          const token = ((Number(tweetId) / 1e15) * Math.PI)
            .toString(Math.pow(6, 2))
            .replace(/(0+|\.)/g, "");

          const tweetResponse = await axios.get(
            `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`
          );
          await new Promise((ok) => setTimeout(ok, 1000));

          const src = tweetResponse.data;
          // console.log("src", src);
          if (replyTo === src.in_reply_to_screen_name) {
            const url = formatTweetUrl(replyTo, src.in_reply_to_status_id_str);
            text = text.replace(`R to @${replyTo}:`, `RE ${url}:`);
          }          
        }

        const tweet = {
          id_str: tweetId,
          url: formatTweetUrl(username, tweetId),
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
      }
    }
    return tweets;
  } catch (error) {
    console.error("Error getting tweets for ", username, error);
    return [];
  }
}

module.exports = {
  getTweets,
};
