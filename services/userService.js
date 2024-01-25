const { generatePrivateKey } = require('nostr-tools');
const { prisma } = require('./db');

async function addUsername(username, relays, bunkerUrl) {
  let user = await prisma.username.findUnique({
    where: { username },
  });

  let relaysString;
  if (Array.isArray(relays)) {
    relaysString = relays.join(',');
  } else {
    relaysString = relays || '';
  }

  if (user) {
    // const existingRelays = user.relays ? user.relays.split(',') : [];
    // const updatedRelays = [...new Set([...existingRelays, ...relays])].join(
    //   ','
    // );

    // just replace them
    const updatedRelays = relaysString;

    user = await prisma.username.update({
      where: { username },
      data: {
        relays: updatedRelays,
        bunkerUrl,
      },
      select: {
        username: true,
        relays: true,
        bunkerUrl: true,
      },
    });
  } else {
    user = await prisma.username.create({
      data: {
        username,
        relays: relaysString,
        secretKey: generatePrivateKey(),
        bunkerUrl,
      },
      select: {
        username: true,
        relays: true,
        bunkerUrl: true,
      },
    });
  }

  return user;
}

async function listUsernames() {
  return await prisma.username.findMany({
    select: {
      username: true,
      relays: true,
      bunkerUrl: true,
    },
  });
}

async function getUserSecret(username) {
  return await prisma.username.findUnique({
    where: { username },
  });
}

module.exports = {
  addUsername,
  listUsernames,
  getUserSecret
};
