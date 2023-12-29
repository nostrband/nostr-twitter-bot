const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generatePrivateKey } = require('nostr-tools');

async function addUsername(username, relays) {
  let user = await prisma.username.findUnique({
    where: { username },
  });

  if (user) {
    user = await prisma.username.update({
      where: { username },
      data: {
        relays: {
          set: [...user.relays.split(','), ...relays.split(',')].join(','),
        },
      },
    });
  } else {
    user = await prisma.username.create({
      data: {
        username,
        relays: relays.join(','),
        secret_key: generatePrivateKey(),
      },
    });
  }

  return user;
}

async function listUsernames() {
  return await prisma.username.findMany();
}

module.exports = {
  addUsername,
  listUsernames,
};
