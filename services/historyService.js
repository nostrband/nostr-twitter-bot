const { prisma } = require("./db");

async function getHistory(username) {
  return await prisma.history.findMany({
    where: { username },
  });
}

module.exports = {
  getHistory,
};
