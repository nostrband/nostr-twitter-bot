const axios = require('axios');

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
    if (error.response && error.response.status !== 404)
      console.error('Error fetching mentioned profile', error);
    else console.log('Not found nostr account for', screenName);
  }
  return null;
}

module.exports = {
  fetchMentionedPubkey,
};
