// exchange/bitget-client.js - Клиент API BitGet

const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

/**
 * Клиент для взаимодействия с API BitGet
 */
class BitGetClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || '';
    this.apiSecret = options.apiSecret || '';
    this.passphrase = options.passphrase || '';
    this.baseUrl = options.baseUrl || 'https://api.bitget.com';
    this.wsUrl = options.wsUrl || 'wss://ws.bitget.com/spot/v1/stream';
    this.timeout = options.timeout || 30000;
    this.demo = options.demo !== undefined ? options.demo : false;
    
    // Настройки для повторных попыток и таймаутов
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Настройки для логирования
    this.debug = options.debug !== undefined ? options.debug : true;
    
    this.log('BitGet API initialized with:');
    this.log('- API Key:', this.apiKey ? `${this.apiKey.substring(0, 4)}...` : 'Not set');
    this.log('- Secret Key:', this.apiSecret ? 'Set (hidden)' : 'Not set');
    this.log('- Passphrase:', this.passphrase ? 'Set (hidden)' : 'Not set');
    this.log('- Demo mode:', this.demo ? 'Enabled' : 'Disabled');
  }

  /**
   * Логирование с разными уровнями
   * @param  {...any} args - Аргументы для логирования
   */
  log(...args) {
    if (this.debug) {
      console.log('[BitgetAPI]', ...args);
    }
  }

  /**
   * Логирование ошибок
   * @param  {...any} args - Аргументы для логирования
   */
  logError(...args) {
    console.error('[BitgetAPI ERROR]', ...args);
  }

  /**
   * Генерация подписи для API запросов
   * @param {string} timestamp - Временная метка
   * @param {string} method - HTTP метод
   * @param {string} requestPath - Путь запроса
   * @param {string} body - Тело запроса
   * @returns {string} - Сгенерированная подпись
   */
  generateSignature(timestamp, method, requestPath, body = '') {
    try {
      // Формируем сообщение для подписи
      const message = timestamp + method.toUpperCase() + requestPath + (body || '');
      
      if (this.debug) {
        this.log('Signature message:', message);
      }
      
      // Создаем HMAC SHA256 подпись с secretKey и кодируем в Base64
      const signature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(message)
        .digest('base64');
      
      if (this.debug) {
        this.log('Generated signature:', signature);
      }
      
      return signature;
    } catch (error) {
      this.logError('Error generating signature:', error);
      throw error;
    }
  }

  /**
   * Выполнение API запроса
   * @param {string} method - HTTP метод
   * @param {string} endpoint - Конечная точка API
   * @param {Object} params - Параметры запроса
   * @param {Object} data - Данные для тела запроса
   * @returns {Promise} - Promise с результатом
   */
  request(method, endpoint, params = {}, data = null, retryCount = 0) {
    return new Promise(async (resolve, reject) => {
      try {
        const timestamp = Date.now().toString();
        let requestPath = endpoint;
        let url = `${this.baseUrl}${endpoint}`;
        let queryString = '';
        
        // Обрабатываем GET параметры
        if (params && Object.keys(params).length > 0 && method.toUpperCase() === 'GET') {
          queryString = '?' + querystring.stringify(params);
          requestPath += queryString;
          url += queryString;
        }
        
        // Преобразуем данные в JSON для POST запросов
        const jsonData = data ? JSON.stringify(data) : '';
        
        // Заголовки для запроса
        const headers = {
          'ACCESS-KEY': this.apiKey,
          'ACCESS-SIGN': this.generateSignature(timestamp, method, requestPath, jsonData),
          'ACCESS-TIMESTAMP': timestamp,
          'ACCESS-PASSPHRASE': this.passphrase,
          'Content-Type': 'application/json'
        };
        
        // Для демо режима добавляем специальный заголовок
        if (this.demo) {
          headers['X-SIMULATED-TRADING'] = '1';
        }
        
        this.log(`API Request: ${method.toUpperCase()} ${url}`);
        this.log('Request params:', params);
        
        if (jsonData) {
          this.log('Request body:', jsonData);
        }
        
        // Выполняем запрос
        const response = await axios({
          method: method.toUpperCase(),
          url,
          headers,
          data: jsonData || undefined,
          timeout: this.timeout
        });
        
        this.log(`API Response (${method.toUpperCase()} ${endpoint}):`, 
                  response.status, response.statusText);
        
        resolve(response.data);
      } catch (error) {
        this.logError(`API Error (${method.toUpperCase()} ${endpoint}):`, error.message);
        
        if (error.response) {
          this.logError('Response status:', error.response.status);
          this.logError('Response data:', error.response.data);
        }
        
        // Проверяем, нужно ли повторить запрос
        if (retryCount < this.maxRetries && 
            (error.code === 'ECONNABORTED' || // Таймаут
             error.code === 'ETIMEDOUT' || // Таймаут
             error.response && error.response.status >= 500)) { // Ошибка сервера
          
          this.log(`Retrying request (${retryCount + 1}/${this.maxRetries}) after ${this.retryDelay}ms...`);
          
          // Ждем перед повторной попыткой
          await new Promise(r => setTimeout(r, this.retryDelay));
          
          try {
            // Рекурсивно вызываем request с увеличенным счетчиком повторов
            const result = await this.request(method, endpoint, params, data, retryCount + 1);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Получение времени сервера
   */
  async getServerTime() {
    try {
      console.log(`[DEBUG] Запрос времени сервера`);
      const response = await this.request('GET', '/api/v2/public/time', {}, null);
      
      // Подробное логирование структуры ответа
      console.log(`[DEBUG] Полный ответ getServerTime:`, JSON.stringify(response));
      
      return response;
    } catch (error) {
      console.error(`[DEBUG] Ошибка в getServerTime:`, error.message);
      throw error;
    }
  }

  /**
   * Получение баланса аккаунта
   */
  async getAccountAssets(marginCoin = 'USDT') {
    return this.request('GET', '/api/v2/mix/account/accounts', { productType: "USDT-FUTURES", marginCoin });
  }

  /**
   * Получение текущих позиций
   */
  async getPositions(symbol, marginCoin = 'USDT') {
    const params = { productType: "USDT-FUTURES" };
    if (symbol) params.symbol = symbol;
    return this.request('GET', '/api/v2/mix/position/all-position', params);
  }

  /**
   * Установка плеча
   */
  async setLeverage(symbol, marginMode, leverage) {
    return this.request('POST', '/api/v2/mix/account/set-leverage', {}, {
      symbol,
      marginMode,
      leverage,
      productType: "USDT-FUTURES",
      marginCoin: "USDT"
    });
  }

  /**
   * Получение открытых ордеров
   */
  async getOpenOrders(symbol, marginCoin = 'USDT') {
    return this.request('GET', '/api/v2/mix/order/current', {
      symbol,
      productType: "USDT-FUTURES",
      marginCoin
    });
  }

  /**
   * Создание ордера
   */
  async submitOrder(params) {
    const orderParams = {
      ...params,
      productType: "USDT-FUTURES"
    };
    return this.request('POST', '/api/v2/mix/order/place-order', {}, orderParams);
  }

  /**
   * Создание плановых ордеров (стоп-лосс, тейк-профит)
   */
  async submitPlanOrder(params) {
    const planParams = {
      ...params,
      productType: "USDT-FUTURES"
    };
    return this.request('POST', '/api/v2/mix/plan/place-plan', {}, planParams);
  }

  /**
   * Отмена ордера
   */
  async cancelOrder(symbol, marginCoin, orderId) {
    return this.request('POST', '/api/v2/mix/order/cancel-order', {}, {
      symbol,
      marginCoin,
      orderId,
      productType: "USDT-FUTURES"
    });
  }

  /**
   * Получение исторических свечей
   */
  async getCandles(symbol, granularity, limit = 100) {
    // Преобразуем временной интервал в правильный формат для API Bitget
    const intervalMap = {
      '1h': '1H',
      '2h': '2H',
      '4h': '4H', 
      '6h': '6H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };
    
    // Преобразуем интервал, если есть в карте преобразований
    const formattedInterval = intervalMap[granularity.toLowerCase()] || granularity;
    
    return this.request('GET', '/api/v2/mix/market/candles', {
      symbol,
      granularity: formattedInterval,
      limit,
      productType: "USDT-FUTURES"
    });
  }

  /**
   * Получение текущего тикера
   */
  async getTicker(symbol) {
    try {
      console.log(`[DEBUG] Запрос тикера для символа: ${symbol}`);
      const response = await this.request('GET', '/api/v2/mix/market/ticker', { 
        symbol, 
        productType: "USDT-FUTURES" 
      });
      
      // Подробное логирование структуры ответа
      console.log(`[DEBUG] Полный ответ getTicker:`, JSON.stringify(response));
      
      // Проверяем наличие данных в разных возможных структурах
      if (!response) {
        console.warn(`[DEBUG] Ответ getTicker пустой для ${symbol}`);
        return { code: 'ERROR', msg: 'Empty response', data: null };
      }
      
      // Проверка на успешность запроса
      if (response.code && response.code !== '00000') {
        console.warn(`[DEBUG] Ошибка API getTicker: ${response.code} - ${response.msg}`);
        return response;
      }
      
      // Проверяем структуру ответа и адаптируемся к ней
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Если data это массив, берем первый элемент
        console.log(`[DEBUG] getTicker вернул массив данных, используем первый элемент`);
        const dataItem = response.data[0];
        // Проверяем наличие lastPr
        if (dataItem.lastPr && !dataItem.last) {
          dataItem.last = dataItem.lastPr;
        }
        return { code: '00000', data: dataItem };
      } 
      else if (response.data && typeof response.data === 'object') {
        // Если data это объект, проверяем наличие lastPr
        if (response.data.lastPr && !response.data.last) {
          response.data.last = response.data.lastPr;
        }
        return response;
      }
      else if (response.ticker || response.tickers) {
        // Альтернативная структура, которая может быть в ответе
        const tickerData = response.ticker || (Array.isArray(response.tickers) ? response.tickers[0] : null);
        if (tickerData) {
          console.log(`[DEBUG] getTicker использует альтернативную структуру данных`);
          // Проверяем наличие lastPr
          if (tickerData.lastPr && !tickerData.last) {
            tickerData.last = tickerData.lastPr;
          }
          return { code: '00000', data: tickerData };
        }
      }
      
      // Если пришел неожиданный формат, но есть какие-то данные о цене
      if (response.last || response.price || response.lastPr || 
          (response.data && (response.data.last || response.data.price || response.data.lastPr))) {
        const lastPrice = response.last || response.price || response.lastPr || 
                           (response.data && (response.data.last || response.data.price || response.data.lastPr));
        console.log(`[DEBUG] getTicker использует прямой доступ к цене: ${lastPrice}`);
        return { code: '00000', data: { last: lastPrice } };
      }
      
      // Если структура не распознана, возвращаем оригинальный ответ с предупреждением
      console.warn(`[DEBUG] Непредвиденная структура ответа getTicker:`, response);
      return response;
    } catch (error) {
      console.error(`[DEBUG] Ошибка в getTicker:`, error.message);
      throw error;
    }
  }

  /**
   * Размещение ордера
   * @param {string} symbol - Символ торговой пары
   * @param {string} side - Сторона (BUY или SELL)
   * @param {string} orderType - Тип ордера (LIMIT или MARKET)
   * @param {string|number} size - Размер ордера
   * @param {number|null} price - Цена для лимитного ордера
   * @param {boolean} reduceOnly - Флаг только для уменьшения позиции
   * @returns {Promise<Object>} - Результат размещения ордера
   */
  async placeOrder(symbol, side, orderType, size, price = null, reduceOnly = false) {
    console.log(`Placing order for ${symbol}: ${side} ${orderType} ${size}`);
    
    // Проверка наличия обязательных параметров
    if (!symbol) {
      const error = new Error('Symbol is required for placing an order');
      return Promise.reject(error);
    }

    // Создаем объект параметров для API
    const params = {
      symbol,
      marginCoin: 'USDT', // По умолчанию USDT
      size: size.toString(),
      side: side.toUpperCase(),
      orderType: orderType.toUpperCase(),
      timeInForceValue: 'normal',
      marginMode: 'isolated', // Важно: добавляем marginMode
      clientOid: `order_${Date.now()}`
    };

    // Добавляем reduceOnly только если он true (согласно документации BitGet)
    if (reduceOnly === true) {
      params.reduceOnly = true;
    }

    // Если это лимитный ордер, добавляем цену
    if (orderType.toUpperCase() === 'LIMIT' && price) {
      params.price = price.toString();
    }

    // Логирование параметров ордера для отладки
    this.log(`Placing order with params:`, JSON.stringify(params));
    
    // Реальное размещение ордера через API
    return this.submitOrder(params);
  }
}

module.exports = BitGetClient;
