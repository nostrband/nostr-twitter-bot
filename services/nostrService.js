const { NDKEvent, NDKPrivateKeySigner } = require('@nostr-dev-kit/ndk');
const { getPublicKey, nip19 } = require('nostr-tools');

function convertToTimestamp(dateString) {
  const dateObject = new Date(dateString);
  return Math.floor(dateObject.getTime() / 1000);
}

async function processUserMentions(tweet, mentionedPubkeys) {
  const mentions = [];
  for (const user of tweet.entities.user_mentions) {
    const pubkey = mentionedPubkeys[user.screen_name];
    if (pubkey) {
      const nostrProfileLink = `nostr:${nip19.nprofileEncode({
        pubkey,
        relays: ['wss://your-relay.com'],
      })}`;
      mentions.push({ screenName: user.screen_name, nostrProfileLink });
    }
  }
  return mentions;
}

async function publishTweetAsNostrEvent(
  tweet,
  nostrPrivateKey,
  mentionedPubkeys
) {
  const signer = new NDKPrivateKeySigner(nostrPrivateKey);
  const pubkey = getPublicKey(nostrPrivateKey);

  let content = tweet.text;

  const mentions = await processUserMentions(tweet, mentionedPubkeys);
  mentions.forEach((mention) => {
    content = content.replace(
      `@${mention.screenName}`,
      mention.nostrProfileLink
    );
  });

  tweet.entities.urls.forEach((url) => {
    content = content.replace(url.url, url.expanded_url);
  });

  const ndkEvent = new NDKEvent({
    pubkey: pubkey,
    created_at: convertToTimestamp(tweet.created_at),
    content: content,
    kind: 1,
  });

  await ndkEvent.sign(signer);

  const result = await ndkEvent.publish();
  return result;
}

module.exports = {
  publishTweetAsNostrEvent,
};
