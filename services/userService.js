const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      select: {
        username: true,
        relays: true,
      },
    });
  } else {
    user = await prisma.username.create({
      data: {
        username,
        relays: relays.join(','),
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
