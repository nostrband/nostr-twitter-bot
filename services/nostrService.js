const { NDKEvent, NDKPrivateKeySigner } = require('@nostr-dev-kit/ndk');
const { getPublicKey } = require('nostr-tools');

function convertToTimestamp(dateString) {
  const dateObject = new Date(dateString);
  return Math.floor(dateObject.getTime() / 1000);
}

async function publishTweetAsNostrEvent(tweet, nostrPrivateKey) {
  const signer = new NDKPrivateKeySigner(nostrPrivateKey);
  const ndkEvent = new NDKEvent({
    pubkey: getPublicKey(nostrPrivateKey),
    created_at: convertToTimestamp(tweet.created_at),
    content: tweet.text,
  });

  const result = await ndkEvent.signAndPublish(signer);
  return result;
}

module.exports = {
  publishTweetAsNostrEvent,
};
