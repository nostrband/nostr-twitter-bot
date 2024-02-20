const { prisma } = require("./db");

async function getHistory(username) {
  return await prisma.history.findMany({
    where: { username },
    orderBy: [ { timestamp: 'desc' } ]
  });
}

module.exports = {
  getHistory,
};
