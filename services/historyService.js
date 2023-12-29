const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getHistory(username) {
  return await prisma.history.findMany({
    where: { username },
  });
}

module.exports = {
  getHistory,
};
