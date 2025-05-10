// index.js - Точка входа для торгового бота

const { TradingBot } = require('./trading-bot');
const config = require('./config');

// Сразу экспортируем класс TradingBot для использования в server.js
module.exports = { TradingBot };

// Если файл запущен напрямую, создаем экземпляр бота
if (require.main === module) {
  // Создание экземпляра бота
  const botConfig = {
    ...config.bot,
    apiKey: config.bitget.apiKey,
    apiSecret: config.bitget.secretKey,
    passphrase: config.bitget.passphrase,
    demo: config.bitget.demo
  };
  
  console.log('Запуск торгового бота BitGet...');
  
  const bot = new TradingBot(botConfig);
  
  // Обработчик сигналов для корректного завершения
  process.on('SIGINT', async () => {
    console.log('\nПолучен сигнал завершения. Останавливаем бота...');
    await bot.stop();
    console.log('Бот остановлен. Завершение процесса.');
    process.exit(0);
  });
  
  // Запуск бота
  bot.start()
    .then(() => {
      console.log('Бот успешно запущен!');
    })
    .catch(error => {
      console.error('Ошибка при запуске бота:', error);
      process.exit(1);
    });
}
