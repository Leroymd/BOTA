// trading-bot.js - Основной класс торгового бота

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const ScalpingStrategy = require('./strategies/scalping-strategy');
const IndicatorManager = require('./indicators/indicator-manager');
const PositionManager = require('./positions/position-manager');
const BitGetClient = require('./exchange/bitget-client');

/**
 * Основной класс торгового бота для BitGet
 */
class TradingBot extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.balance = 0;
    this.initialBalance = 0;
    this.currentPrice = 0;
    this.status = {
      status: 'stopped',
      balance: 0,
      pnl: {
        daily: 0,
        total: 0
      },
      openPositions: [],
      lastTrades: [],
      indicators: {},
      currentPrice: 0,
      startTime: null,
      uptime: 0,
      reinvestment: {
        enabled: true,
        percentage: 100,
        totalWithdrawn: 0,
        lastWithdrawal: null
      },
      stats: {
        winRate: 0,
        totalTrades: 0,
        profitFactor: 0
      }
    };
    
    // Инициализация менеджеров
    this.indicatorManager = new IndicatorManager(this.config);
    this.positionManager = new PositionManager(this.config);
    this.strategy = new ScalpingStrategy(this.config, this.indicatorManager, this.positionManager);
    
    this.logs = [];
    this.maxLogs = 100; // Максимальное количество сообщений в логах
    this.intervals = [];
    
    // Инициализация статистики
    this.dailyPerformance = {
      startBalance: 0,
      currentBalance: 0,
      trades: [],
      winCount: 0,
      lossCount: 0,
      startTime: null,
      activeDay: false
    };
    
    // Настройки реинвестирования
    this.reinvestmentInfo = {
      enabled: config.reinvestment !== undefined ? config.reinvestment > 0 : true,
      percentage: config.reinvestment !== undefined ? config.reinvestment : 100,
      lastProfitWithdrawal: null,
      totalWithdrawn: 0,
      withdrawalThreshold: 50,
      withdrawalPercentage: 20
    };
  }
// Добавьте следующий метод в класс PositionManager в файле positions/position-manager.js

/**
 * Обновление параметров позиции
 * @param {string} positionId - ID позиции
 * @param {Object} params - Параметры для обновления
 * @returns {Promise<boolean>} - Результат обновления
 */
async updatePositionParams(positionId, params) {
  try {
    const position = this.openPositions.find(p => p.id === positionId);
    
    if (!position) {
      console.warn(`Позиция с ID ${positionId} не найдена`);
      return false;
    }
    
    // Обновляем тейк-профит, если указан
    if (params.takeProfit !== undefined) {
      const takeProfitPrice = position.type === 'LONG' 
        ? position.entryPrice * (1 + params.takeProfit / 100)
        : position.entryPrice * (1 - params.takeProfit / 100);
      
      // Обновляем в локальном объекте
      position.takeProfitPrice = takeProfitPrice;
      
      // Отменяем существующий TP ордер
      const openOrders = await this.client.getOpenOrders(this.config.symbol, 'USDT');
      
      if (openOrders.data && openOrders.data.length > 0) {
        for (const order of openOrders.data) {
          if (order.clientOid && order.clientOid.includes(`tp_${position.id}`)) {
            await this.client.cancelOrder(this.config.symbol, 'USDT', order.orderId);
          }
        }
      }
      
      // Создаем новый TP ордер
      const tpParams = {
        symbol: this.config.symbol,
        marginCoin: 'USDT',
        triggerPrice: takeProfitPrice.toFixed(6),
        triggerType: 'market_price',
        orderType: 'market',
        side: position.type === 'LONG' ? 3 : 4, // 3 - close long, 4 - close short
        size: '100%',
        clientOid: `tp_${position.id}_${new Date().getTime()}`
      };
      
      await this.client.submitPlanOrder(tpParams);
      console.log(`Обновлен тейк-профит для позиции ${positionId} до ${takeProfitPrice.toFixed(6)}`);
    }
    
    // Обновляем стоп-лосс, если указан
    if (params.stopLoss !== undefined) {
      const stopLossPrice = position.type === 'LONG'
        ? position.entryPrice * (1 - params.stopLoss / 100)
        : position.entryPrice * (1 + params.stopLoss / 100);
      
      // Обновляем в локальном объекте
      position.stopLossPrice = stopLossPrice;
      
      // Отменяем существующий SL ордер
      const openOrders = await this.client.getOpenOrders(this.config.symbol, 'USDT');
      
      if (openOrders.data && openOrders.data.length > 0) {
        for (const order of openOrders.data) {
          if (order.clientOid && order.clientOid.includes(`sl_${position.id}`)) {
            await this.client.cancelOrder(this.config.symbol, 'USDT', order.orderId);
          }
        }
      }
      
      // Создаем новый SL ордер
      const slParams = {
        symbol: this.config.symbol,
        marginCoin: 'USDT',
        triggerPrice: stopLossPrice.toFixed(6),
        triggerType: 'market_price',
        orderType: 'market',
        side: position.type === 'LONG' ? 3 : 4, // 3 - close long, 4 - close short
        size: '100%',
        clientOid: `sl_${position.id}_${new Date().getTime()}`
      };
      
      await this.client.submitPlanOrder(slParams);
      console.log(`Обновлен стоп-лосс для позиции ${positionId} до ${stopLossPrice.toFixed(6)}`);
    }
    
    // Обновляем настройки трейлинг-стопа, если указаны
    if (params.trailingStop !== undefined) {
      // Включение или выключение трейлинг-стопа
      if (params.trailingStop.enabled !== undefined) {
        position.trailingStopActivated = params.trailingStop.enabled;
      }
      
      // Если трейлинг-стоп включен, сразу устанавливаем его
      if (position.trailingStopActivated) {
        await this.setTrailingStop(position, this.client.currentPrice);
        console.log(`Обновлен трейлинг-стоп для позиции ${positionId}`);
      }
    }
    
    this.emit('position_updated', position);
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении параметров позиции:', error);
    return false;
  }
}
  /**
   * Добавление сообщения в логи
   * @param {string} message - Текст сообщения
   * @param {string} category - Категория (trading, indicators, system)
   * @param {string} level - Уровень (info, warning, error, success)
   */
  addLog(message, category = 'system', level = 'info') {
    const logEntry = {
      timestamp: new Date().getTime(),
      message,
      category,
      level
    };
    
    // Добавляем запись в начало массива
    this.logs.unshift(logEntry);
    
    // Ограничиваем размер логов
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Выводим в консоль сервера для отладки
    let logPrefix = '[БОТ]';
    if (category === 'trading') logPrefix = '[ТОРГОВЛЯ]';
    else if (category === 'indicators') logPrefix = '[ИНДИКАТОРЫ]';
    
    if (level === 'error') {
      console.error(`${logPrefix} ${message}`);
    } else if (level === 'warning') {
      console.warn(`${logPrefix} ${message}`);
    } else {
      console.log(`${logPrefix} ${message}`);
    }
    
    // Отправляем обновление через событие
    this.emit('log_update', logEntry);
  }

  /**
   * Запуск бота
   * @returns {Promise<boolean>} Результат запуска
   */
  async start() {
    try {
      console.log('Инициализация торгового бота BitGet...');
      this.addLog('Инициализация торгового бота BitGet...', 'system');
      
      // Инициализация клиента API
      this.client = new BitGetClient({
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        passphrase: this.config.passphrase,
        demo: this.config.demo || false
      });
      
      // Установка клиента API для менеджеров
      this.positionManager.setClient(this.client);
      this.strategy.setClient(this.client);
      
      // Проверка соединения с API
      try {
        const serverTimeResponse = await this.client.getServerTime();
        console.log(`[DEBUG] Ответ getServerTime при старте:`, JSON.stringify(serverTimeResponse));
        
        let serverTimeStr = "Недоступно";
        let serverTimestamp = null;
        
        if (serverTimeResponse && serverTimeResponse.data) {
          if (typeof serverTimeResponse.data === 'number') {
            serverTimestamp = serverTimeResponse.data;
          } else if (typeof serverTimeResponse.data === 'string') {
            serverTimestamp = Number(serverTimeResponse.data);
          } else if (serverTimeResponse.data.timestamp) {
            serverTimestamp = Number(serverTimeResponse.data.timestamp);
          } else if (serverTimeResponse.data.serverTime) {
            serverTimestamp = Number(serverTimeResponse.data.serverTime);
          }
        }
        
        if (serverTimestamp !== null && !isNaN(serverTimestamp)) {
          if (serverTimestamp < 10000000000) {
            serverTimestamp *= 1000;
          }
          const serverDate = new Date(serverTimestamp);
          if (serverDate && serverDate.toLocaleString() !== 'Invalid Date') {
            serverTimeStr = serverDate.toLocaleString();
          }
        }
        
        this.addLog(`Соединение с BitGet API установлено. Серверное время: ${serverTimeStr}`, 'system', 'success');
      } catch (timeError) {
        console.warn('[DEBUG] Ошибка при получении времени сервера:', timeError);
        this.addLog(`Предупреждение: не удалось получить время сервера: ${timeError.message}`, 'system', 'warning');
      }
      
      // Получение текущего баланса
      const accountBalance = await this.client.getAccountAssets('USDT');
      
      if (accountBalance && accountBalance.data && accountBalance.data.length > 0) {
        this.balance = parseFloat(accountBalance.data[0].available);
        this.initialBalance = this.balance;
        console.log(`Текущий баланс: ${this.balance} USDT`);
        this.addLog(`Текущий баланс: ${this.balance} USDT`, 'system', 'info');
        
        // Обновление баланса в менеджерах
        this.positionManager.setBalance(this.balance);
      } else {
        console.warn('Не удалось получить информацию о балансе:', accountBalance);
        this.addLog('Предупреждение: не удалось получить информацию о балансе', 'system', 'warning');
        this.balance = 0;
        this.initialBalance = 0;
      }
      
      // Получаем текущую цену
      await this.updateMarketData();
      
      // Установка плеча
      try {
        await this.client.setLeverage(this.config.symbol, 'isolated', this.config.leverage.toString());
        console.log(`Установлено плечо: ${this.config.leverage}x`);
        this.addLog(`Установлено плечо: ${this.config.leverage}x`, 'system', 'info');
      } catch (leverageError) {
        console.warn('Не удалось установить плечо:', leverageError.message);
        this.addLog(`Предупреждение: не удалось установить плечо: ${leverageError.message}`, 'system', 'warning');
      }
      
      // Настройка реинвестирования
      console.log(`Реинвестирование: ${this.reinvestmentInfo.enabled ? 'Включено' : 'Выключено'} (${this.reinvestmentInfo.percentage}%)`);
      this.addLog(`Реинвестирование: ${this.reinvestmentInfo.enabled ? 'Включено' : 'Выключено'} (${this.reinvestmentInfo.percentage}%)`, 'system', 'info');
      
      // Инициализация дневной статистики
      this.resetDailyPerformance();
      
      // Получение текущих открытых позиций
      await this.positionManager.updateOpenPositions(this.currentPrice);
      
      // Инициализация исторических данных для индикаторов
      await this.indicatorManager.initialize(this.client, this.config.symbol);
      
      // Запуск интервалов для обновления данных
      this.startIntervals();
      
      console.log('Инициализация завершена. Бот готов к торговле.');
      this.addLog('Инициализация завершена. Бот готов к торговле.', 'system', 'success');
      
      this.status.status = 'running';
      this.status.startTime = new Date().getTime();
      
      // Отправляем первоначальное обновление статуса
      this.updateStatus();
      
      return true;
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      this.addLog(`Ошибка инициализации: ${error.message}`, 'system', 'error');
      throw error;
    }
  }

  /**
   * Остановка бота
   * @returns {Promise<boolean>} Результат остановки
   */
  async stop() {
    try {
      console.log('Остановка торгового бота...');
      this.addLog('Остановка торгового бота...', 'system', 'info');
      
      // Сохраняем статистику
      this.saveDailyPerformance();
      this.saveTradeHistory();
      
      // Останавливаем все интервалы
      for (const interval of this.intervals) {
        clearInterval(interval);
      }
      this.intervals = [];
      
      this.status.status = 'stopped';
      this.updateStatus();
      
      console.log('Бот успешно остановлен');
      this.addLog('Бот успешно остановлен', 'system', 'success');
      return true;
    } catch (error) {
      console.error('Ошибка при остановке бота:', error);
      this.addLog(`Ошибка при остановке бота: ${error.message}`, 'system', 'error');
      throw error;
    }
  }
  
  /**
   * Проверка работает ли бот
   * @returns {boolean} Состояние бота
   */
  isRunning() {
    return this.status.status === 'running';
  }
  
  /**
   * Получение текущего статуса бота
   * @returns {Object} Статус бота
   */
  getStatus() {
    this.updateStatus();
    return this.status;
  }
  
  /**
   * Обновление конфигурации
   * @param {Object} newConfig - Новая конфигурация
   * @returns {boolean} Результат обновления
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Обновляем конфигурацию в менеджерах
    this.indicatorManager.updateConfig(newConfig);
    this.positionManager.updateConfig(newConfig);
    this.strategy.updateConfig(newConfig);
    
    console.log('Конфигурация бота обновлена');
    this.addLog('Конфигурация бота обновлена', 'system', 'info');
    return true;
  }

  /**
   * Запуск циклов обновления
   */
  startIntervals() {
    // Основной цикл торговли - каждую минуту
    const tradingInterval = setInterval(async () => {
      try {
        if (this.status.status !== 'running') return;
        
        // Проверка времени и обновление дневной статистики при необходимости
        this.checkAndUpdateDailyStats();
        
        // Получение свежих рыночных данных
        await this.updateMarketData();
        
        // Обновление индикаторов
        await this.indicatorManager.updateIndicators(this.currentPrice);
        
        // Обновление открытых позиций
        await this.positionManager.updateOpenPositions(this.currentPrice);
        
        // Проверка и обновление трейлинг-стопов для открытых позиций
        await this.positionManager.updateTrailingStops(this.currentPrice);
        
        // Проверка максимальной длительности открытых позиций
        await this.positionManager.checkPositionDuration();
        
        // Проверка лимита убытков
        if (this.checkDailyLossLimit()) {
          console.warn('Достигнут дневной лимит убытков. Торговля приостановлена.');
          this.addLog('Достигнут дневной лимит убытков. Торговля приостановлена.', 'system', 'warning');
          return;
        }
        
        // Проверка необходимости вывода части прибыли (система реинвестирования)
        await this.checkProfitWithdrawal();
        
        // Выполнение торговой стратегии
        await this.strategy.execute(this.currentPrice);
        
        // Обновляем статус для клиентов
        this.updateStatus();
        
      } catch (error) {
        console.error('Ошибка в торговом цикле:', error);
        this.addLog(`Ошибка в торговом цикле: ${error.message}`, 'system', 'error');
      }
    }, 60000); // Обновление каждую минуту
    
    // Быстрое обновление для трейлинг-стопов и цены каждые 15 секунд
    const fastUpdateInterval = setInterval(async () => {
      try {
        if (this.status.status !== 'running') return;
        
        // Быстрое обновление рыночных данных
        const ticker = await this.client.getTicker(this.config.symbol);
        if (ticker && ticker.data && ticker.data.last) {
          this.currentPrice = parseFloat(ticker.data.last);
          this.status.currentPrice = this.currentPrice;
        }
        
        // Обновление трейлинг-стопов
        await this.positionManager.updateTrailingStops(this.currentPrice);
        
      } catch (error) {
        console.error('Ошибка в быстром обновлении:', error);
        this.addLog(`Ошибка в быстром обновлении: ${error.message}`, 'system', 'error');
      }
    }, 15000);
    
    // Сохранение истории каждые 5 минут
    const historyInterval = setInterval(() => {
      try {
        if (this.status.status !== 'running') return;
        
        // Сохраняем историю сделок
        this.saveTradeHistory();
        
      } catch (error) {
        console.error('Ошибка при сохранении истории:', error);
        this.addLog(`Ошибка при сохранении истории: ${error.message}`, 'system', 'error');
      }
    }, 300000);
    
    // Добавляем интервалы в список для возможности остановки
    this.intervals.push(tradingInterval, fastUpdateInterval, historyInterval);
  }

  /**
   * Обновление рыночных данных
   * @returns {Promise<number>} Текущая цена
   */
  async updateMarketData() {
    try {
      // Получение текущей цены
      const ticker = await this.client.getTicker(this.config.symbol);
      if (ticker && ticker.data && ticker.data.last) {
        this.currentPrice = parseFloat(ticker.data.last);
        this.status.currentPrice = this.currentPrice;
        
        // Передаем цену в индикаторный менеджер для обновления исторических данных
        await this.indicatorManager.updateHistoricalData(this.client, this.config.symbol);
      } else {
        console.warn('Не удалось получить текущую цену');
        this.addLog('Не удалось получить текущую цену', 'system', 'warning');
      }
      
      // Вызов события обновления баланса
      if (this.status.startTime && this.status.status === 'running') {
        const now = new Date().getTime();
        const timeSinceStart = now - this.status.startTime;
        
        // Раз в час обновляем данные о балансе
        if (timeSinceStart > 0 && timeSinceStart % 3600000 < 60000) {
          await this.updateAccountBalance();
        }
      }
      
      return this.currentPrice;
    } catch (error) {
      console.error('Ошибка при обновлении рыночных данных:', error);
      this.addLog(`Ошибка при обновлении рыночных данных: ${error.message}`, 'system', 'error');
      throw error;
    }
  }

  /**
   * Обновление баланса аккаунта
   */
  async updateAccountBalance() {
    try {
      const accountBalance = await this.client.getAccountAssets('USDT');
      if (accountBalance && accountBalance.data && accountBalance.data.length > 0) {
        this.balance = parseFloat(accountBalance.data[0].available);
        this.positionManager.setBalance(this.balance);
        this.addLog(`Баланс обновлен: ${this.balance.toFixed(2)} USDT`, 'system', 'info');
      } else {
        console.warn('Не удалось получить данные о балансе');
        this.addLog('Не удалось получить данные о балансе', 'system', 'warning');
      }
    } catch (error) {
      console.error('Ошибка при обновлении баланса:', error);
      this.addLog(`Ошибка при обновлении баланса: ${error.message}`, 'system', 'error');
    }
  }

  /**
   * Обновление статуса
   * @returns {Object} Обновленный статус
   */
  updateStatus() {
    const now = new Date().getTime();
    
    if (this.status.status === 'running') {
      this.status.uptime = now - this.status.startTime;
    }
    
    // Обновление статистики
    if (this.dailyPerformance && this.dailyPerformance.startBalance > 0) {
      this.status.pnl.daily = ((this.balance - this.dailyPerformance.startBalance) / this.dailyPerformance.startBalance) * 100;
    }
    
    // Обновление общей прибыли с начала работы
    if (this.initialBalance > 0) {
      this.status.pnl.total = ((this.balance - this.initialBalance) / this.initialBalance) * 100;
    }
    
    // Обновление информации о реинвестировании
    this.status.reinvestment = {
      enabled: this.reinvestmentInfo.enabled,
      percentage: this.reinvestmentInfo.percentage,
      totalWithdrawn: this.reinvestmentInfo.totalWithdrawn,
      lastWithdrawal: this.reinvestmentInfo.lastProfitWithdrawal,
      withdrawalThreshold: this.reinvestmentInfo.withdrawalThreshold
    };
    
    // Общая статистика
    const positionHistory = this.positionManager.getPositionHistory();
    const totalTrades = positionHistory.length;
    const winTrades = positionHistory.filter(trade => trade.result === 'win').length;
    
    this.status.stats.totalTrades = totalTrades;
    this.status.stats.winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    
    // Последние сделки
    this.status.lastTrades = positionHistory
      .slice(-10)
      .reverse()
      .map(trade => ({
        id: trade.id,
        type: trade.type,
        entryPrice: trade.entryPrice,
        closePrice: trade.closePrice || 0,
        pnl: trade.pnl || 0,
        result: trade.result || 'open',
        entryTime: trade.entryTime,
        closeTime: trade.closeTime || 0,
        confidenceLevel: trade.confidenceLevel || 0
      }));
    
    // Открытые позиции
    this.status.openPositions = this.positionManager.getOpenPositions().map(pos => ({
      id: pos.id,
      type: pos.type,
      entryPrice: pos.entryPrice,
      currentPnl: pos.currentPnl || 0,
      size: pos.size,
      entryTime: pos.entryTime,
      takeProfitPrice: pos.takeProfitPrice,
      stopLossPrice: pos.stopLossPrice,
      confidenceLevel: pos.confidenceLevel || 0
    }));
    
    // Обновляем баланс
    this.status.balance = this.balance;
    
    // Добавляем данные индикаторов
    this.status.indicators = this.indicatorManager.getCurrentIndicators();
    
    // Отправляем обновление через событие
    this.emit('update', this.status);
    
    return this.status;
  }

  /**
   * Проверка необходимости вывода части прибыли (система реинвестирования)
   */
  async checkProfitWithdrawal() {
    try {
      if (!this.reinvestmentInfo.enabled) return;
      
      // Рассчитываем текущую прибыль в процентах от начального баланса
      const currentProfit = ((this.balance - this.initialBalance) / this.initialBalance) * 100;
      
      // Если прибыль превысила порог и это не первый запуск
      if (currentProfit >= this.reinvestmentInfo.withdrawalThreshold && this.initialBalance > 0) {
        // Проверяем, был ли ранее вывод прибыли или прошло достаточно времени с последнего вывода
        const now = new Date().getTime();
        const lastWithdrawalTime = this.reinvestmentInfo.lastProfitWithdrawal || 0;
        const daysSinceLastWithdrawal = (now - lastWithdrawalTime) / (1000 * 60 * 60 * 24);
        
        // Если это первый вывод или прошло минимум 1 день с последнего вывода
        if (!this.reinvestmentInfo.lastProfitWithdrawal || daysSinceLastWithdrawal >= 1) {
          // Рассчитываем сумму для вывода (% от прибыли)
          const totalProfit = this.balance - this.initialBalance;
          const withdrawalAmount = totalProfit * (this.reinvestmentInfo.withdrawalPercentage / 100);
          
          console.log(`Достигнут порог вывода прибыли (${currentProfit.toFixed(2)}% > ${this.reinvestmentInfo.withdrawalThreshold}%)`);
          console.log(`Вывод ${this.reinvestmentInfo.withdrawalPercentage}% прибыли: ${withdrawalAmount.toFixed(2)} USDT`);
          
          this.addLog(`Достигнут порог вывода прибыли (${currentProfit.toFixed(2)}% > ${this.reinvestmentInfo.withdrawalThreshold}%)`, 'trading');
          this.addLog(`Вывод ${this.reinvestmentInfo.withdrawalPercentage}% прибыли: ${withdrawalAmount.toFixed(2)} USDT`, 'trading', 'success');
          
          // Обновляем статистику вывода прибыли
          this.reinvestmentInfo.lastProfitWithdrawal = now;
          this.reinvestmentInfo.totalWithdrawn += withdrawalAmount;
          
          // Эмулируем вывод средств (уменьшаем доступный баланс)
          // В реальном боте здесь должен быть API вызов для вывода/перевода
          this.balance -= withdrawalAmount;
          this.positionManager.setBalance(this.balance);
          
          // Записываем событие в лог
          console.log(`Успешно выведено ${withdrawalAmount.toFixed(2)} USDT. Общая сумма выводов: ${this.reinvestmentInfo.totalWithdrawn.toFixed(2)} USDT`);
          
          // Обновляем статус
          this.updateStatus();
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Ошибка при проверке вывода прибыли:', error);
      this.addLog(`Ошибка при проверке вывода прибыли: ${error.message}`, 'trading', 'error');
      return false;
    }
  }

  /**
   * Проверка дневного лимита убытков
   */
  checkDailyLossLimit() {
    try {
      if (!this.dailyPerformance.activeDay) return false;
      
      // Рассчитываем текущую просадку от начального баланса
      const currentDrawdown = ((this.dailyPerformance.startBalance - this.balance) / this.dailyPerformance.startBalance) * 100;
      
      // Если просадка превышает дневной лимит, возвращаем true
      if (currentDrawdown >= this.config.riskManagement.dailyLossLimit) {
        console.warn(`Достигнут дневной лимит убытков (${this.config.riskManagement.dailyLossLimit}%). Текущая просадка: ${currentDrawdown.toFixed(2)}%`);
        this.addLog(`Достигнут дневной лимит убытков (${this.config.riskManagement.dailyLossLimit}%). Текущая просадка: ${currentDrawdown.toFixed(2)}%`, 'system', 'warning');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Ошибка при проверке дневного лимита убытков:', error);
      this.addLog(`Ошибка при проверке дневного лимита убытков: ${error.message}`, 'system', 'error');
      return false;
    }
  }

  /**
   * Проверка и обновление дневной статистики
   */
  checkAndUpdateDailyStats() {
    try {
      const now = new Date();
      const currentDay = now.toDateString();
      
      // Если день еще не начат, инициализируем его
      if (!this.dailyPerformance.activeDay) {
        this.resetDailyPerformance();
        console.log(`Начат новый торговый день: ${currentDay}`);
        this.addLog(`Начат новый торговый день: ${currentDay}`, 'system', 'info');
        return;
      }
      
      // Если день сменился, сохраняем статистику и начинаем новый день
      const startDay = new Date(this.dailyPerformance.startTime).toDateString();
      if (startDay !== currentDay) {
        // Сохраняем статистику
        this.saveDailyPerformance();
        
        // Сбрасываем статистику на новый день
        this.resetDailyPerformance();
        console.log(`Начат новый торговый день: ${currentDay}`);
        this.addLog(`Начат новый торговый день: ${currentDay}`, 'system', 'info');
      }
    } catch (error) {
      console.error('Ошибка при обновлении дневной статистики:', error);
      this.addLog(`Ошибка при обновлении дневной статистики: ${error.message}`, 'system', 'error');
    }
  }

  /**
   * Сброс дневной статистики
   */
  resetDailyPerformance() {
    this.dailyPerformance = {
      startBalance: this.balance,
      currentBalance: this.balance,
      trades: [],
      winCount: 0,
      lossCount: 0,
      startTime: new Date().getTime(),
      activeDay: true
    };
  }

  /**
   * Сохранение дневной статистики
   */
  saveDailyPerformance() {
    try {
      const performanceData = {
        ...this.dailyPerformance,
        endBalance: this.balance,
        endTime: new Date().getTime(),
        totalTrades: this.dailyPerformance.winCount + this.dailyPerformance.lossCount,
        winRate: this.dailyPerformance.winCount + this.dailyPerformance.lossCount > 0 
          ? (this.dailyPerformance.winCount / (this.dailyPerformance.winCount + this.dailyPerformance.lossCount)) * 100 
          : 0,
        profit: ((this.balance - this.dailyPerformance.startBalance) / this.dailyPerformance.startBalance) * 100
      };
      
      // Форматируем имя файла по дате
      const startDate = new Date(this.dailyPerformance.startTime);
      const fileName = `performance_${startDate.toISOString().split('T')[0]}.json`;
      
      // Создаем директорию, если её нет
      const performancePath = path.join(__dirname, 'performance');
      if (!fs.existsSync(performancePath)) {
        fs.mkdirSync(performancePath);
      }
      
      // Сохраняем файл
      fs.writeFileSync(
        path.join(performancePath, fileName),
        JSON.stringify(performanceData, null, 2)
      );
      
      console.log(`Сохранена дневная статистика в файл ${fileName}`);
      this.addLog(`Сохранена дневная статистика в файл ${fileName}`, 'system', 'info');
      
      // Также сохраняем статистику всех сделок
      this.saveTradeHistory();
    } catch (error) {
      console.error('Ошибка при сохранении дневной статистики:', error);
      this.addLog(`Ошибка при сохранении дневной статистики: ${error.message}`, 'system', 'error');
    }
  }

  /**
   * Сохранение истории сделок
   */
  saveTradeHistory() {
    try {
      // Сохраняем историю сделок
      const historyPath = path.join(__dirname, 'history');
      if (!fs.existsSync(historyPath)) {
        fs.mkdirSync(historyPath);
      }
      
      fs.writeFileSync(
        path.join(historyPath, 'trade_history.json'),
        JSON.stringify(this.positionManager.getPositionHistory(), null, 2)
      );
      
      console.log('История сделок сохранена');
    } catch (error) {
      console.error('Ошибка при сохранении истории сделок:', error);
      this.addLog(`Ошибка при сохранении истории сделок: ${error.message}`, 'system', 'error');
    }
  }

  /**
   * Получение логов бота
   * @param {number} limit - Максимальное количество сообщений
   * @returns {Array} - Массив логов
   */
  getLogs(limit = 100) {
    return this.logs.slice(0, limit);
  }

  /**
   * Получение данных сравнения индикаторов
   * @returns {Object} - Данные сравнения
   */
  getIndicatorsComparison() {
    return this.indicatorManager.getIndicatorsComparison();
  }
}

module.exports = { TradingBot };
