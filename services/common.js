function parseBunkerUrl(bunkerUrl) {
  try {
    const url = new URL(bunkerUrl);
    if (url.protocol !== "bunker:") throw new Error("Bad schema");
    return {
      // in NodeJS, it's host, not pathname with //pubkey
      pubkey: url.hostname, // url.pathname.split("//")[1],
      relays: url.searchParams.getAll("relay"),
    };
  } catch (e) {
    console.log("bad bunker url", bunkerUrl, e);
    return undefined;
  }
}

module.exports = {
  parseBunkerUrl,
};
