const { prisma } = require("./db");

async function addUsername({ username, relays, bunkerUrl, secretKey }) {

  let relaysString;
  if (Array.isArray(relays)) {
    relaysString = relays.join(",");
  } else {
    relaysString = relays || "";
  }

  return await prisma.username.upsert({
    where: { username },
    create: {
      username,
      relays: relaysString,
      secretKey,
      bunkerUrl,
    },
    update: {
      relays: relaysString,
      secretKey,
      bunkerUrl,
    },
    select: {
      username: true,
      relays: true,
      bunkerUrl: true,
    },
  });
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

async function setNextScan(username, sec) {
  await prisma.username.update({
    where: { username },
    data: {
      nextScan: new Date(Date.now() + sec * 1000),
    }
  });
}

module.exports = {
  addUsername,
  listUsernames,
  setNextScan,
};
