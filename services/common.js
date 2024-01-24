const axios = require("axios");

let mentionedPubkeysCache = {};

async function fetchMentionedPubkey(screenName) {
  if (screenName in mentionedPubkeysCache) {
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
    if (error.response && error.response.status !== 404) {
      console.error("Error fetching mentioned profile", screenName, error);
    } else {
      console.log("Not found nostr account for", screenName);
      mentionedPubkeysCache[screenName] = null      
    } 
  }
  return null;
}

function parseBunkerUrl(bunkerUrl) {
  try {
    const url = new URL(bunkerUrl);
    if (url.protocol !== "bunker:") throw new Error("Bad schema");
    return {
      // in NodeJS, it's host, not pathname with //pubkey
      pubkey: url.host, // url.pathname.split("//")[1],
      relays: url.searchParams.getAll("relay"),
    };
  } catch (e) {
    console.log("bad bunker url", bunkerUrl, e);
    return undefined;
  }
}

module.exports = {
  fetchMentionedPubkey,
  parseBunkerUrl,
};
