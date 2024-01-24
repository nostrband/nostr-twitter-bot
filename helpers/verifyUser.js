async function verifyNostrAuth(req, expectedPath) {
  try {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Nostr ')) {
      return false;
    }

    const event = JSON.parse(authorization.split(' ')[1].trim());

    if (!event.pubkey) {
      console.error('Public key is undefined in the event');
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (event.created_at < now - 60 || event.created_at > now + 60) {
      return false;
    }

    const url = new URL(
      req.protocol + '://' + req.get('host') + req.originalUrl
    );
    if (url.pathname !== expectedPath) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

module.exports = { verifyNostrAuth };
