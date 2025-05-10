// server.js - Express сервер с веб-интерфейсом для торгового бота

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { TradingBot } = require('./bot'); // Импортируем основной класс бота
const config = require('./config'); // Импортируем конфигурацию

// Создаем Express приложение
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Разрешаем подключения с любого источника
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Глобальный объект для хранения экземпляра бота
let bot = null;

// Подключаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API эндпоинты
app.get('/api/bot/status', (req, res) => {
  if (!bot) {
    return res.json({ status: 'stopped', message: 'Бот не запущен' });
  }
  
  const status = bot.getStatus();
  res.json(status);
});
// Добавьте эти API маршруты в файл server.js

/**
 * API для частичного закрытия позиции
 */
app.post('/api/bot/position/:positionId/close', async (req, res) => {
  try {
    if (!bot || !bot.isRunning()) {
      return res.json({ success: false, message: 'Бот не запущен' });
    }
    
    const { positionId } = req.params;
    const { percentage } = req.body;
    
    if (!positionId) {
      return res.status(400).json({ success: false, message: 'Не указан ID позиции' });
    }
    
    if (!percentage || percentage < 1 || percentage > 100) {
      return res.status(400).json({ success: false, message: 'Некорректный процент закрытия' });
    }
    
    const result = await bot.positionManager.closePosition(positionId, percentage);
    
    if (result) {
      res.json({ success: true, message: `Позиция ${positionId} закрыта на ${percentage}%` });
    } else {
      res.status(500).json({ success: false, message: 'Не удалось закрыть позицию' });
    }
  } catch (error) {
    console.error('Ошибка при закрытии позиции:', error);
    res.status(500).json({ success: false, message: `Ошибка при закрытии позиции: ${error.message}` });
  }
});

/**
 * API для установки параметров для конкретной позиции
 */
app.post('/api/bot/position/:positionId/params', async (req, res) => {
  try {
    if (!bot || !bot.isRunning()) {
      return res.json({ success: false, message: 'Бот не запущен' });
    }
    
    const { positionId } = req.params;
    const { takeProfit, stopLoss, trailingStop } = req.body;
    
    if (!positionId) {
      return res.status(400).json({ success: false, message: 'Не указан ID позиции' });
    }
    
    // Изменение параметров для указанной позиции
    const result = await bot.positionManager.updatePositionParams(positionId, {
      takeProfit,
      stopLoss,
      trailingStop
    });
    
    if (result) {
      res.json({ success: true, message: 'Параметры позиции обновлены' });
    } else {
      res.status(500).json({ success: false, message: 'Не удалось обновить параметры позиции' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении параметров позиции:', error);
    res.status(500).json({ success: false, message: `Ошибка при обновлении параметров позиции: ${error.message}` });
  }
});

/**
 * API для получения истории сделок
 */
app.get('/api/bot/trades', async (req, res) => {
  try {
    if (!bot) {
      return res.json({ success: false, message: 'Бот не запущен', trades: [] });
    }
    
    const trades = bot.positionManager.getPositionHistory();
    res.json({ success: true, trades });
  } catch (error) {
    console.error('Ошибка при получении истории сделок:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении истории сделок', trades: [] });
  }
});

/**
 * API для получения дневной статистики
 */
app.get('/api/bot/daily-stats', async (req, res) => {
  try {
    if (!bot) {
      return res.json({ success: false, message: 'Бот не запущен', stats: null });
    }
    
    const stats = bot.getDailyStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Ошибка при получении дневной статистики:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении дневной статистики', stats: null });
  }
});

/**
 * API для ручного открытия позиции
 */
app.post('/api/bot/position/open', async (req, res) => {
  try {
    if (!bot || !bot.isRunning()) {
      return res.json({ success: false, message: 'Бот не запущен' });
    }
    
    const { type, size, price } = req.body;
    
    if (!type || !['LONG', 'SHORT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Некорректный тип позиции' });
    }
    
    // Открытие позиции
    const result = await bot.positionManager.openPosition(
      type,
      price || bot.status.currentPrice,
      'Ручное открытие позиции',
      75 // Уверенность для ручного открытия
    );
    
    if (result) {
      res.json({ success: true, message: `Позиция ${type} успешно открыта`, position: result });
    } else {
      res.status(500).json({ success: false, message: 'Не удалось открыть позицию' });
    }
  } catch (error) {
    console.error('Ошибка при открытии позиции:', error);
    res.status(500).json({ success: false, message: `Ошибка при открытии позиции: ${error.message}` });
  }
});
app.get('/api/bot/config', (req, res) => {
  // Отправляем конфигурацию бота (объединяем с config.bot для полных данных)
  const botConfig = {
    ...config.bot,
    apiKey: config.bitget.apiKey ? true : false, // Не отправляем сами ключи, только флаг
    apiSecret: config.bitget.secretKey ? true : false,
    passphrase: config.bitget.passphrase ? true : false,
    demo: config.bitget.demo
  };
  
  res.json(botConfig);
});

app.post('/api/bot/config', (req, res) => {
  try {
    const newConfig = req.body;
    
    // Обновляем конфигурацию бота
    if (newConfig.apiKey || newConfig.apiSecret || newConfig.passphrase || newConfig.demo !== undefined) {
      // Обновляем API ключи и режим (demo/real)
      if (newConfig.apiKey) config.bitget.apiKey = newConfig.apiKey;
      if (newConfig.apiSecret) config.bitget.secretKey = newConfig.apiSecret;
      if (newConfig.passphrase) config.bitget.passphrase = newConfig.passphrase;
      if (newConfig.demo !== undefined) config.bitget.demo = newConfig.demo;
      
      // Удаляем эти поля из объекта newConfig, чтобы они не попали в config.bot
      delete newConfig.apiKey;
      delete newConfig.apiSecret;
      delete newConfig.passphrase;
      delete newConfig.demo;
    }
    
    // Обновляем остальные настройки бота
    config.bot = { ...config.bot, ...newConfig };
    
    // Сохраняем обновленную конфигурацию
    require('./config').saveConfig(config);
    
    // Применяем новые настройки к боту, если он запущен
    if (bot) {
      bot.updateConfig(config.bot);
    }
    
    res.json({ success: true, message: 'Конфигурация обновлена' });
  } catch (error) {
    console.error('Ошибка при обновлении конфигурации:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении конфигурации' });
  }
});

// Фрагмент из server.js - эндпоинт /api/bot/start

app.post('/api/bot/start', (req, res) => {
  try {
    if (bot && bot.isRunning()) {
      return res.json({ success: false, message: 'Бот уже запущен' });
    }
    
    // Проверяем наличие API ключей
    if (!config.bitget.apiKey || !config.bitget.secretKey || !config.bitget.passphrase) {
      return res.status(400).json({ 
        success: false, 
        message: 'Необходимо настроить API ключи BitGet перед запуском бота' 
      });
    }
    
    // Добавляем отладочный вывод для проверки ключей
    console.log('API Key для запуска бота:', config.bitget.apiKey ? 'установлен' : 'отсутствует');
    console.log('Secret Key для запуска бота:', config.bitget.secretKey ? 'установлен' : 'отсутствует');
    console.log('Passphrase для запуска бота:', config.bitget.passphrase ? 'установлен' : 'отсутствует');
    
    // Создаем и запускаем бота с передачей API-ключей из config.bitget
    const botConfig = {
      ...config.bot,
      apiKey: config.bitget.apiKey,
      apiSecret: config.bitget.secretKey, // Передаем как apiSecret
      passphrase: config.bitget.passphrase,
      demo: config.bitget.demo
    };
    
    console.log('Запуск бота с конфигурацией:', {
      ...botConfig,
      apiKey: botConfig.apiKey ? 'Set (hidden)' : 'Not set',
      apiSecret: botConfig.apiSecret ? 'Set (hidden)' : 'Not set',
      passphrase: botConfig.passphrase ? 'Set (hidden)' : 'Not set'
    });
    
    bot = new TradingBot(botConfig);
    bot.on('update', (data) => {
      io.emit('bot_update', data);
    });
    bot.on('log_update', (logData) => {
  io.emit('log_update', logData);
});

bot.on('indicator_update', (indicatorData) => {
  io.emit('indicator_update', indicatorData);
});
    bot.start()
      .then(() => {
        res.json({ success: true, message: 'Бот успешно запущен' });
      })
      .catch(error => {
        console.error('Ошибка при запуске бота:', error);
        res.status(500).json({ success: false, message: `Ошибка при запуске бота: ${error.message}` });
      });
  } catch (error) {
    console.error('Ошибка при запуске бота:', error);
    res.status(500).json({ success: false, message: `Ошибка при запуске бота: ${error.message}` });
  }
});
app.post('/api/bot/stop', (req, res) => {
  try {
    if (!bot || !bot.isRunning()) {
      return res.json({ success: false, message: 'Бот не запущен' });
    }
    
    bot.stop()
      .then(() => {
        res.json({ success: true, message: 'Бот успешно остановлен' });
      })
      .catch(error => {
        console.error('Ошибка при остановке бота:', error);
        res.status(500).json({ success: false, message: `Ошибка при остановке бота: ${error.message}` });
      });
  } catch (error) {
    console.error('Ошибка при остановке бота:', error);
    res.status(500).json({ success: false, message: `Ошибка при остановке бота: ${error.message}` });
  }
});

app.get('/api/bot/history', (req, res) => {
  try {
    const historyPath = path.join(__dirname, 'history', 'trade_history.json');
    
    if (!fs.existsSync(historyPath)) {
      return res.json([]);
    }
    
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    res.json(history);
  } catch (error) {
    console.error('Ошибка при получении истории сделок:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении истории сделок' });
  }
});
app.get('/api/bot/logs', (req, res) => {
  try {
    if (!bot) {
      return res.json({ success: false, message: 'Бот не запущен', logs: [] });
    }
    
    const logs = bot.getLogs();
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Ошибка при получении логов:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении логов', logs: [] });
  }
});

// Получение данных сравнения индикаторов
app.get('/api/bot/indicators/comparison', (req, res) => {
  try {
    if (!bot) {
      return res.json({ success: false, message: 'Бот не запущен', comparison: {} });
    }
    
    const comparison = bot.getIndicatorsComparison();
    res.json({ success: true, comparison });
  } catch (error) {
    console.error('Ошибка при получении данных сравнения:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении данных сравнения', comparison: {} });
  }
});

// Сохранение настроек индикаторов
app.post('/api/bot/config/indicators', (req, res) => {
  try {
    const { indicators, advancedSettings } = req.body;
    
    // Обновляем конфигурацию бота
    if (indicators) {
      config.bot.entries = { ...config.bot.entries, ...indicators };
      config.bot.filters = { ...config.bot.filters, ...indicators.filters };
    }
    
    if (advancedSettings) {
      // Объединяем с существующими настройками
      config.bot = { ...config.bot, ...advancedSettings };
    }
    
    // Сохраняем обновленную конфигурацию
    config.saveConfig(config);
    
    // Применяем новые настройки к боту, если он запущен
    if (bot) {
      bot.updateConfig(config.bot);
    }
    
    res.json({ success: true, message: 'Настройки индикаторов обновлены' });
  } catch (error) {
    console.error('Ошибка при сохранении настроек индикаторов:', error);
    res.status(500).json({ success: false, message: 'Ошибка при сохранении настроек индикаторов' });
  }
});

app.get('/api/bot/performance', (req, res) => {
  try {
    // Получаем все файлы из директории с дневной статистикой
    const performancePath = path.join(__dirname, 'performance');
    
    if (!fs.existsSync(performancePath)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(performancePath)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        // Сортировка по дате (в названии файла)
        const dateA = new Date(a.replace('performance_', '').replace('.json', ''));
        const dateB = new Date(b.replace('performance_', '').replace('.json', ''));
        return dateB - dateA; // От новых к старым
      });
    
    // Загружаем данные из каждого файла
    const performanceData = files.map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(performancePath, file), 'utf8'));
      } catch (err) {
        console.error(`Ошибка при чтении файла ${file}:`, err);
        return null;
      }
    }).filter(data => data !== null);
    
    res.json(performanceData);
  } catch (error) {
    console.error('Ошибка при получении данных о производительности:', error);
    res.status(500).json({ success: false, message: 'Ошибка при получении данных о производительности' });
  }
});
// Дополнения для server.js - для поддержки мультиботовой системы

// Импортируем новые модули
const MultiBotManager = require('./multi-bot-manager');
const PairScanner = require('./pair-scanner');

// Глобальный объект для хранения менеджера ботов
let botManager = null;

// API эндпоинты для управления менеджером ботов

// Получение статуса менеджера ботов
app.get('/api/manager/status', (req, res) => {
  if (!botManager) {
    return res.json({ 
      status: 'not_initialized', 
      message: 'Менеджер ботов не инициализирован' 
    });
  }
  
  const status = botManager.getStatus();
  res.json(status);
});

// Инициализация менеджера ботов
app.post('/api/manager/initialize', async (req, res) => {
  try {
    if (botManager) {
      return res.json({ 
        success: false, 
        message: 'Менеджер ботов уже инициализирован' 
      });
    }
    
    // Создаем менеджер ботов
    botManager = new MultiBotManager({
      apiKey: config.bitget.apiKey,
      apiSecret: config.bitget.secretKey,
      passphrase: config.bitget.passphrase,
      demo: config.bitget.demo,
      botConfig: config.bot
    });
    
    // Настраиваем обработчики событий
    botManager.on('status_update', (status) => {
      io.emit('manager_status_update', status);
    });
    
    botManager.on('bot_update', (botData) => {
      io.emit('bot_update', botData);
    });
    
    botManager.on('log_update', (logEntry) => {
      io.emit('manager_log', logEntry);
    });
    
    botManager.on('bot_log', (botLogData) => {
      io.emit('bot_log', botLogData);
    });
    
    botManager.on('pairs_updated', (pairs) => {
      io.emit('pairs_updated', pairs);
    });
    
    botManager.on('scanner_log', (logEntry) => {
      io.emit('scanner_log', logEntry);
    });
    
    // Инициализируем менеджер
    await botManager.initialize();
    
    res.json({ 
      success: true, 
      message: 'Менеджер ботов успешно инициализирован' 
    });
  } catch (error) {
    console.error('Ошибка при инициализации менеджера ботов:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при инициализации менеджера ботов: ${error.message}` 
    });
  }
});

// Запуск менеджера ботов
app.post('/api/manager/start', async (req, res) => {
  try {
    if (!botManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const botCount = req.body.botCount || 1;
    
    if (botCount < 1 || botCount > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Количество ботов должно быть от 1 до 5' 
      });
    }
    
    const result = await botManager.start(botCount);
    
    if (result) {
      res.json({ 
        success: true, 
        message: `Менеджер ботов успешно запущен с ${botCount} ботами` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Не удалось запустить менеджер ботов' 
      });
    }
  } catch (error) {
    console.error('Ошибка при запуске менеджера ботов:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при запуске менеджера ботов: ${error.message}` 
    });
  }
});

// Остановка менеджера ботов
app.post('/api/manager/stop', async (req, res) => {
  try {
    if (!botManager) {
      return res.json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const result = await botManager.stop();
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Менеджер ботов успешно остановлен' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Не удалось остановить менеджер ботов' 
      });
    }
  } catch (error) {
    console.error('Ошибка при остановке менеджера ботов:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при остановке менеджера ботов: ${error.message}` 
    });
  }
});

// Добавление ботов
app.post('/api/manager/add-bots', async (req, res) => {
  try {
    if (!botManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const botCount = req.body.botCount || 1;
    
    if (botCount < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Количество ботов должно быть положительным числом' 
      });
    }
    
    const result = await botManager.startBots(botCount);
    
    res.json({ 
      success: true, 
      message: `Добавлено ${result.length} ботов`, 
      bots: result 
    });
  } catch (error) {
    console.error('Ошибка при добавлении ботов:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при добавлении ботов: ${error.message}` 
    });
  }
});

// Остановка конкретного бота
app.post('/api/manager/stop-bot/:botId', async (req, res) => {
  try {
    if (!botManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const { botId } = req.params;
    
    const result = await botManager.stopBot(botId);
    
    if (result) {
      res.json({ 
        success: true, 
        message: `Бот ${botId} успешно остановлен` 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: `Не удалось остановить бота ${botId}` 
      });
    }
  } catch (error) {
    console.error(`Ошибка при остановке бота ${req.params.botId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при остановке бота: ${error.message}` 
    });
  }
});

// Перезапуск конкретного бота
app.post('/api/manager/restart-bot/:botId', async (req, res) => {
  try {
    if (!botManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const { botId } = req.params;
    
    const result = await botManager.restartBot(botId);
    
    if (result) {
      res.json({ 
        success: true, 
        message: `Бот ${botId} успешно перезапущен` 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: `Не удалось перезапустить бота ${botId}` 
      });
    }
  } catch (error) {
    console.error(`Ошибка при перезапуске бота ${req.params.botId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при перезапуске бота: ${error.message}` 
    });
  }
});

// Получение информации о парах
app.get('/api/manager/pairs', (req, res) => {
  try {
    if (!botManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const pairsInfo = botManager.getPairsInfo();
    res.json(pairsInfo);
  } catch (error) {
    console.error('Ошибка при получении информации о парах:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при получении информации о парах: ${error.message}` 
    });
  }
});

// Принудительное сканирование пар
app.post('/api/manager/force-scan', async (req, res) => {
  try {
    if (!botManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован' 
      });
    }
    
    const pairs = await botManager.forceScan();
    
    res.json({ 
      success: true, 
      message: `Сканирование завершено, найдено ${pairs.length} пар`, 
      pairs 
    });
  } catch (error) {
    console.error('Ошибка при принудительном сканировании пар:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при принудительном сканировании пар: ${error.message}` 
    });
  }
});

// Получение логов менеджера
app.get('/api/manager/logs', (req, res) => {
  try {
    if (!botManager) {
      return res.json({ 
        success: false, 
        message: 'Менеджер ботов не инициализирован', 
        logs: [] 
      });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const logs = botManager.getLogs(limit);
    
    res.json({ 
      success: true, 
      logs 
    });
  } catch (error) {
    console.error('Ошибка при получении логов менеджера:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при получении логов менеджера: ${error.message}`, 
      logs: [] 
    });
  }
});

// Получение логов сканера
app.get('/api/manager/scanner-logs', (req, res) => {
  try {
    if (!botManager || !botManager.pairScanner) {
      return res.json({ 
        success: false, 
        message: 'Сканер пар не инициализирован', 
        logs: [] 
      });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const logs = botManager.pairScanner.getLogs(limit);
    
    res.json({ 
      success: true, 
      logs 
    });
  } catch (error) {
    console.error('Ошибка при получении логов сканера:', error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при получении логов сканера: ${error.message}`, 
      logs: [] 
    });
  }
});

// Анализ конкретной пары
app.post('/api/manager/analyze-pair', async (req, res) => {
  try {
    if (!botManager || !botManager.pairScanner) {
      return res.status(400).json({ 
        success: false, 
        message: 'Сканер пар не инициализирован' 
      });
    }
    
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Необходимо указать символ пары' 
      });
    }
    
    const result = await botManager.pairScanner.scanSinglePair(symbol);
    
    if (result) {
      res.json({ 
        success: true, 
        message: `Анализ пары ${symbol} успешно выполнен`, 
        result 
      });
    } else {
      res.json({ 
        success: false, 
        message: `Пара ${symbol} не соответствует критериям или произошла ошибка при анализе` 
      });
    }
  } catch (error) {
    console.error(`Ошибка при анализе пары:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Ошибка при анализе пары: ${error.message}` 
    });
  }
});
// Обработка WebSocket соединений
io.on('connection', (socket) => {
  console.log('Новое WebSocket соединение');
  
  // Отправляем текущий статус бота при подключении
  if (bot) {
    socket.emit('bot_update', bot.getStatus());
  } else {
    socket.emit('bot_update', { status: 'stopped', message: 'Бот не запущен' });
  }
  
  socket.on('disconnect', () => {
    console.log('WebSocket соединение закрыто');
  });
});

// Все остальные запросы обрабатываются клиентским приложением
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
const PORT = config.server.port || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Веб-интерфейс доступен по адресу: http://localhost:${PORT}`);
});