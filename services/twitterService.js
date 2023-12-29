const axios = require('axios');

async function getTweets(username, token) {
  try {
    const response = await axios.get(
      `https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${username}&count=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log(response.data, 'RESPONSE DATA TEEEST');
    return response.data; // Возвращает массив твитов
  } catch (error) {
    console.error('Ошибка при получении твитов:', error);
    return [];
  }
}

module.exports = {
  getTweets,
};
