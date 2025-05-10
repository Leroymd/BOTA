// multi-bot-manager.js - Управление несколькими ботами в системе

const EventEmitter = require('events');
const { TradingBot } = require('./trading-bot'); // Обновленный импорт из нового файла
const PairScanner = require('./pair-scanner');
const config = require('./config');

/**
 * Класс для управления несколькими торговыми ботами
 */
class MultiBotManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxBots: options.maxBots || 5,
      apiKey: options.apiKey || config.bitget.apiKey,
      apiSecret: options.apiSecret || config.bitget.secretKey,
      passphrase: options.passphrase || config.bitget.passphrase,
      demo: options.demo !== undefined ? options.demo : config.bitget.demo,
      scanInterval: options.scanInterval || 60 * 60 * 1000, // 1 час по умолчанию
      botConfig: options.botConfig || config.bot,
      pairScannerOptions: options.pairScannerOptions || {}
    };
    
    this.bots = {};
    this.activeBots = 0;
    this.pairScanner = null;
    this.refreshInterval = null;
    this.logs = [];
    this.maxLogs = 100;
  }
  
  /**
   * Инициализация менеджера ботов
   * @returns {Promise<boolean>} Результат инициализации
   */
  async initialize() {
    try {
      this.log('Инициализация менеджера ботов...', 'info');
      
      // Создаем сканер пар
      this.pairScanner = new PairScanner({
        apiKey: this.options.apiKey,
        apiSecret: this.options.apiSecret,
        passphrase: this.options.passphrase,
        demo: this.options.demo,
        scanInterval: this.options.scanInterval,
        ...this.options.pairScannerOptions
      });
      
      // Привязываем обработчики событий сканера
      this.pairScanner.on('pairs_updated', (pairs) => {
        this.handlePairsUpdated(pairs);
      });
      
      this.pairScanner.on('log_update', (logEntry) => {
        this.emit('scanner_log', logEntry);
      });
      
      // Инициализируем сканер
      await this.pairScanner.initialize();
      
      this.log('Менеджер ботов успешно инициализирован', 'success');
      return true;
    } catch (error) {
      this.log(`Ошибка инициализации менеджера ботов: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Запуск менеджера ботов
   * @param {number} botCount - Количество ботов для запуска
   * @returns {Promise<boolean>} Результат запуска
   */
  async start(botCount = 1) {
    try {
      if (botCount < 1 || botCount > this.options.maxBots) {
        this.log(`Некорректное количество ботов. Допустимый диапазон: 1-${this.options.maxBots}`, 'error');
        return false;
      }
      
      this.log(`Запуск менеджера ботов с количеством ботов: ${botCount}...`, 'info');
      
      // Запускаем сканер пар
      await this.pairScanner.start();
      
      // Получаем первоначальные пары для ботов
      const filteredPairs = this.pairScanner.getFilteredPairs();
      
      if (filteredPairs.length === 0) {
        this.log('Не найдено подходящих пар. Запускаем сканирование...', 'warning');
        await this.pairScanner.scanPairs();
      }
      
      // Запускаем боты с найденными парами
      await this.startBots(botCount);
      
      // Запускаем интервал обновления состояния
      this.refreshInterval = setInterval(() => {
        this.updateStatus();
      }, 60000); // Обновление каждую минуту
      
      this.log('Менеджер ботов успешно запущен', 'success');
      return true;
    } catch (error) {
      this.log(`Ошибка при запуске менеджера ботов: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Остановка менеджера ботов
   * @returns {Promise<boolean>} Результат остановки
   */
  async stop() {
    try {
      this.log('Остановка менеджера ботов...', 'info');
      
      // Останавливаем сканер пар
      if (this.pairScanner) {
        this.pairScanner.stop();
      }
      
      // Останавливаем интервал обновления
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
      
      // Останавливаем все боты
      for (const botId in this.bots) {
        await this.stopBot(botId);
      }
      
      this.log('Менеджер ботов успешно остановлен', 'success');
      return true;
    } catch (error) {
      this.log(`Ошибка при остановке менеджера ботов: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Запуск указанного количества ботов
   * @param {number} count - Количество ботов
   * @returns {Promise<Array>} Список запущенных ботов
   */
  async startBots(count) {
    try {
      // Проверка максимального количества
      if (this.activeBots + count > this.options.maxBots) {
        this.log(`Превышено максимальное количество ботов (${this.options.maxBots})`, 'warning');
        count = this.options.maxBots - this.activeBots;
      }
      
      if (count <= 0) {
        this.log('Все слоты ботов уже используются', 'warning');
        return [];
      }
      
      // Получаем подходящие пары
      const filteredPairs = this.pairScanner.getFilteredPairs();
      
      if (filteredPairs.length === 0) {
        this.log('Нет подходящих пар для запуска ботов', 'warning');
        return [];
      }
      
      const startedBots = [];
      
      // Запускаем боты на лучших парах
      for (let i = 0; i < count && i < filteredPairs.length; i++) {
        const pair = filteredPairs[i];
        const botId = `bot_${Date.now()}_${i}`;
        
        // Создаем конфигурацию для бота
        const botConfig = {
          ...this.options.botConfig,
          symbol: pair.symbol,
          apiKey: this.options.apiKey,
          apiSecret: this.options.apiSecret,
          passphrase: this.options.passphrase,
          demo: this.options.demo
        };
        
        this.log(`Запуск бота ${botId} на паре ${pair.symbol}...`, 'info');
        
        // Создаем бота
        const bot = new TradingBot(botConfig);
        
        // Подписываемся на события бота
        bot.on('update', (status) => {
          this.emit('bot_update', { botId, status });
        });
        
        bot.on('log_update', (logEntry) => {
          this.emit('bot_log', { botId, logEntry });
        });
        
        // Дополнительные события позиций
        bot.positionManager.on('position_opened', (position) => {
          this.emit('position_opened', { botId, position });
        });
        
        bot.positionManager.on('position_closed', (data) => {
          this.emit('position_closed', { botId, data });
        });
        
        bot.positionManager.on('position_updated', (position) => {
          this.emit('position_updated', { botId, position });
        });
        
        // Запускаем бота
        try {
          await bot.start();
          
          // Сохраняем ссылку на бота
          this.bots[botId] = {
            bot,
            config: botConfig,
            status: 'running',
            startTime: Date.now(),
            pair: pair.symbol,
            analysis: pair.analysis
          };
          
          this.activeBots++;
          startedBots.push({ botId, pair: pair.symbol });
          
          this.log(`Бот ${botId} успешно запущен на паре ${pair.symbol}`, 'success');
        } catch (botError) {
          this.log(`Ошибка при запуске бота ${botId}: ${botError.message}`, 'error');
        }
      }
      
      // Обновляем общий статус
      this.updateStatus();
      
      return startedBots;
    } catch (error) {
      this.log(`Ошибка при запуске ботов: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Остановка конкретного бота
   * @param {string} botId - Идентификатор бота
   * @returns {Promise<boolean>} Результат остановки
   */
  async stopBot(botId) {
    try {
      if (!this.bots[botId]) {
        this.log(`Бот с ID ${botId} не найден`, 'warning');
        return false;
      }
      
      const { bot, pair } = this.bots[botId];
      
      this.log(`Остановка бота ${botId} на паре ${pair}...`, 'info');
      
      // Останавливаем бота
      await bot.stop();
      
      // Обновляем статус
      this.bots[botId].status = 'stopped';
      this.activeBots--;
      
      this.log(`Бот ${botId} успешно остановлен`, 'success');
      
      // Обновляем общий статус
      this.updateStatus();
      
      return true;
    } catch (error) {
      this.log(`Ошибка при остановке бота ${botId}: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Перезапуск бота на новой паре
   * @param {string} botId - Идентификатор бота
   * @returns {Promise<boolean>} Результат перезапуска
   */
  async restartBot(botId) {
    try {
      if (!this.bots[botId]) {
        this.log(`Бот с ID ${botId} не найден`, 'warning');
        return false;
      }
      
      // Останавливаем бота
      await this.stopBot(botId);
      
      // Получаем новую пару из отфильтрованных
      const filteredPairs = this.pairScanner.getFilteredPairs();
      
      if (filteredPairs.length === 0) {
        this.log('Нет подходящих пар для перезапуска бота', 'warning');
        return false;
      }
      
      // Выбираем лучшую пару, которая еще не используется другими ботами
      const usedPairs = Object.values(this.bots)
        .filter(botInfo => botInfo.status === 'running')
        .map(botInfo => botInfo.pair);
      
      const availablePair = filteredPairs.find(pair => !usedPairs.includes(pair.symbol));
      
      if (!availablePair) {
        this.log('Нет доступных пар для перезапуска бота', 'warning');
        return false;
      }
      
      // Обновляем конфигурацию бота
      const botConfig = {
        ...this.bots[botId].config,
        symbol: availablePair.symbol
      };
      
      this.log(`Перезапуск бота ${botId} на паре ${availablePair.symbol}...`, 'info');
      
      // Создаем нового бота
      const bot = new TradingBot(botConfig);
      
      // Подписываемся на события бота
      bot.on('update', (status) => {
        this.emit('bot_update', { botId, status });
      });
      
      bot.on('log_update', (logEntry) => {
        this.emit('bot_log', { botId, logEntry });
      });
      
      // Дополнительные события позиций
      bot.positionManager.on('position_opened', (position) => {
        this.emit('position_opened', { botId, position });
      });
      
      bot.positionManager.on('position_closed', (data) => {
        this.emit('position_closed', { botId, data });
      });
      
      bot.positionManager.on('position_updated', (position) => {
        this.emit('position_updated', { botId, position });
      });
      
      // Запускаем бота
      await bot.start();
      
      // Обновляем информацию о боте
      this.bots[botId] = {
        bot,
        config: botConfig,
        status: 'running',
        startTime: Date.now(),
        pair: availablePair.symbol,
        analysis: availablePair.analysis
      };
      
      this.activeBots++;
      
      this.log(`Бот ${botId} успешно перезапущен на паре ${availablePair.symbol}`, 'success');
      
      // Обновляем общий статус
      this.updateStatus();
      
      return true;
    } catch (error) {
      this.log(`Ошибка при перезапуске бота ${botId}: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Обработка обновления списка отфильтрованных пар
   * @param {Array} pairs - Список отфильтрованных пар
   */
  handlePairsUpdated(pairs) {
    this.log(`Получено обновление списка пар. Найдено ${pairs.length} подходящих пар`, 'info');
    
    // Проверяем, нужно ли перезапустить какие-то боты
    for (const botId in this.bots) {
      const botInfo = this.bots[botId];
      
      // Анализируем только запущенные боты
      if (botInfo.status !== 'running') continue;
      
      // Проверяем, является ли текущая пара бота все еще хорошим вариантом
      const pairStillValid = pairs.some(pair => pair.symbol === botInfo.pair);
      
      if (!pairStillValid) {
        this.log(`Пара ${botInfo.pair} больше не соответствует критериям. Планируем перезапуск бота ${botId}`, 'warning');
        
        // Запланируем перезапуск бота с небольшой задержкой
        setTimeout(() => {
          this.restartBot(botId)
            .catch(error => {
              this.log(`Ошибка при плановом перезапуске бота ${botId}: ${error.message}`, 'error');
            });
        }, 1000 * 60 * 5); // 5 минут задержки
      }
    }
    
    // Сообщаем об обновлении пар
    this.emit('pairs_updated', pairs);
  }
  
  /**
   * Обновление общего статуса менеджера
   */
  updateStatus() {
    const status = {
      activeBots: this.activeBots,
      maxBots: this.options.maxBots,
      bots: {},
      scanner: {
        isScanning: this.pairScanner ? this.pairScanner.isScanning : false,
        lastScanTime: this.pairScanner ? this.pairScanner.lastScanTime : 0,
        filteredPairs: this.pairScanner ? this.pairScanner.getFilteredPairs() : []
      }
    };
    
    // Собираем информацию о каждом боте
    for (const botId in this.bots) {
      const botInfo = this.bots[botId];
      
      status.bots[botId] = {
        status: botInfo.status,
        pair: botInfo.pair,
        startTime: botInfo.startTime,
        uptime: botInfo.status === 'running' ? Date.now() - botInfo.startTime : 0,
        botStatus: botInfo.bot.getStatus()
      };
    }
    
    // Отправляем обновление статуса
    this.emit('status_update', status);
    
    return status;
  }
  
  /**
   * Получение текущего статуса менеджера
   * @returns {Object} Статус менеджера
   */
  getStatus() {
    return this.updateStatus();
  }
  
  /**
   * Получение информации о доступных парах
   * @returns {Object} Информация о парах
   */
  getPairsInfo() {
    if (!this.pairScanner) {
      return {
        available: 0,
        filtered: 0,
        pairs: []
      };
    }
    
    return {
      available: this.pairScanner.availablePairs.length,
      filtered: this.pairScanner.filteredPairs.length,
      pairs: this.pairScanner.getFilteredPairs(),
      lastScanTime: this.pairScanner.lastScanTime
    };
  }
  
  /**
   * Принудительное сканирование пар
   * @returns {Promise<Array>} Список отфильтрованных пар
   */
  async forceScan() {
    try {
      if (!this.pairScanner) {
        this.log('Сканер пар не инициализирован', 'error');
        return [];
      }
      
      this.log('Запуск принудительного сканирования пар...', 'info');
      
      const pairs = await this.pairScanner.scanPairs();
      
      this.log(`Принудительное сканирование завершено. Найдено ${pairs.length} пар`, 'success');
      
      return pairs;
    } catch (error) {
      this.log(`Ошибка при принудительном сканировании: ${error.message}`, 'error');
      return [];
    }
  }
  
  /**
   * Добавление записи в лог
   * @param {string} message - Сообщение для логирования
   * @param {string} level - Уровень (info, warning, error, success)
   */
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().getTime(),
      message,
      level
    };
    
    // Добавляем запись в начало массива
    this.logs.unshift(logEntry);
    
    // Ограничиваем размер логов
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Выводим в консоль для отладки
    let logPrefix = '[МЕНЕДЖЕР]';
    
    if (level === 'error') {
      console.error(`${logPrefix} ${message}`);
    } else if (level === 'warning') {
      console.warn(`${logPrefix} ${message}`);
    } else {
      console.log(`${logPrefix} ${message}`);
    }
    
    // Отправляем событие с обновлением лога
    this.emit('log_update', logEntry);
  }
  
  /**
   * Получение логов менеджера
   * @param {number} limit - Максимальное количество записей
   * @returns {Array} Массив логов
   */
  getLogs(limit = null) {
    if (limit && limit > 0) {
      return this.logs.slice(0, limit);
    }
    return this.logs;
  }
}

module.exports = MultiBotManager;
