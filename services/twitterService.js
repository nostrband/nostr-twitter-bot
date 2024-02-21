const axios = require("axios");
const xml2js = require("xml2js");
const { prisma } = require("./db");

// FIXME maybe use https://status.d420.de/ api?
const NITTERS = [
  "https://nitter.moomoo.me",
  // "https://nitter.catsarch.com",
  // "https://nitter.freedit.eu",
  "https://nitter.esmailelbob.xyz",
  // "https://nitter.uni-sonia.com",
  "https://nitter.kylrth.com",
  "https://nitter.jakefrosty.com",
  "https://nitter.adminforge.de",
  "https://nitter.poast.org",
  "https://nitter.mint.lgbt",
];

// function parseDate(dateString) {
//   return new Date(dateString).getTime();
// }

function extractIdFromGuid(guid) {
  const match = guid.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

// function extractAuthorFromGuid(guid) {
//   const match = guid.match(/\/(\w+)\/status/);
//   return match ? match[1] : null;
// }

// function extractParentAuthorFromText(text) {
//   const match = text.match(/R to @(\w+):/);
//   return match ? match[1] : null;
// }

// function extractHashtags(text) {
//   const regex = /#\w+/g;
//   return text.match(regex) || [];
// }

// function extractUserMentions(text) {
//   const regex = /@\w+/g;
//   return text.match(regex) || [];
// }

function formatTweetUrl(username, id) {
  return `https://twitter.com/${username}/status/${id}`;
}

function formatProfileUrl(username) {
  return `https://twitter.com/${username}`;
}

async function getTweet(tweetId) {
  // some magic
  const token = ((Number(tweetId) / 1e15) * Math.PI)
    .toString(Math.pow(6, 2))
    .replace(/(0+|\.)/g, "");

  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`
  const tweetResponse = await axios.get(url);
  console.log({ url, tweetResponse });
  await new Promise((ok) => setTimeout(ok, 1000));

  return tweetResponse.data;
}

async function getTweets(username) {
  const nitterUrl = process.env.NITTER || NITTERS[Math.floor(Math.random() * NITTERS.length)];
  console.log("Using", nitterUrl, "for", username);

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
      if (item.title[0].startsWith("RT by @")) {
        console.log("Skip RT", tweetId);
        continue;
      }
      const isAlreadyImported = await prisma.history.findFirst({
        where: {
          tweetId: tweetId,
        },
      });

      if (isAlreadyImported) {
        console.log("Skip imported", tweetId);
        continue;
      }

      try {
        const tweet = await getTweet(tweetId);
        if (tweet) {
          console.log("got tweet", tweetId, "by", username);
          tweets.push(tweet);
        }
        // DEBUG
        //if (tweets.length >= 5) break;
      } catch (e) {
        console.log("Failed to fetch tweet", tweetId, "by", username, e);
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
  getTweet,
  formatTweetUrl,
  formatProfileUrl,
};
