const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generatePrivateKey } = require('nostr-tools');

async function addUsername(username, relays) {
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
    const existingRelays = user.relays ? user.relays.split(',') : [];
    const updatedRelays = [...new Set([...existingRelays, ...relays])].join(
      ','
    );

    user = await prisma.username.update({
      where: { username },
      data: {
        relays: updatedRelays,
      },
      select: {
        username: true,
        relays: true,
      },
    });
  } else {
    user = await prisma.username.create({
      data: {
        username,
        relays: relaysString,
        secretKey: generatePrivateKey(),
      },
      select: {
        username: true,
        relays: true,
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
    },
  });
}

module.exports = {
  addUsername,
  listUsernames,
};
