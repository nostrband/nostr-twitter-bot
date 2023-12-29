const express = require('express');
const app = express();
const addRoute = require('./routes/add');
const listRoute = require('./routes/list');
const historyRoute = require('./routes/history');

app.use(express.json()); // Для обработки JSON-запросов

// Здесь будут подключаться маршруты
// Пример: const userRoutes = require('./routes/users');
// app.use('/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use('/add', addRoute);
app.use('/list', listRoute);
app.use('/history', historyRoute);
