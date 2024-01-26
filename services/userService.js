const { prisma } = require("./db");

function formatRelays(relays) {
  if (Array.isArray(relays)) {
    return relays.join(",");
  } else {
    return relays || "";
  }
}

async function upsertUsername({ username, relays, bunkerUrl, secretKey }) {

  return await prisma.username.upsert({
    where: { username },
    create: {
      username,
      relays: formatRelays(relays),
      secretKey,
      bunkerUrl,
    },
    update: {
      relays: formatRelays(relays),
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

async function updateUsername({ username, relays }) {

  return await prisma.username.update({
    where: { username },
    data: {
      relays: formatRelays(relays),
      nextScan: new Date(),
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
  addUsername: upsertUsername,
  updateUsername,
  listUsernames,
  setNextScan,
};
