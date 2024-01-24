const { generatePrivateKey } = require('nostr-tools');
const { prisma } = require('./db');

async function addUsername(username, relays, bunkerUrl) {
  let user = await prisma.username.findUnique({
    where: { username },
  });

  if (user) {
    user = await prisma.username.update({
      where: { username },
      data: {
        relays: {
          set: [...user.relays.split(','), ...relays].join(','),
        },
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
        relays: relays.join(','),
        bunkerUrl,
        secretKey: generatePrivateKey()
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
