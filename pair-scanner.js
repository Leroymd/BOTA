// pair-scanner.js - Модуль для сканирования и анализа торговых пар

const technicalindicators = require('technicalindicators');
const EventEmitter = require('events');
const { TradingBot } = require('./trading-bot'); // Обновленный импорт из нового файла
const config = require('./config');
const BitGetClient = require('./exchange/bitget-client'); // Обновленный путь к BitGetClient

/**
 * Класс для сканирования и анализа торговых пар
 */
class PairScanner extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxPairs: options.maxPairs || 10,
      scanInterval: options.scanInterval || 60 * 60 * 1000, // 1 час по умолчанию
      apiKey: options.apiKey || config.bitget.apiKey,
      apiSecret: options.apiSecret || config.bitget.secretKey,
      passphrase: options.passphrase || config.bitget.passphrase,
      demo: options.demo !== undefined ? options.demo : config.bitget.demo,
      indicatorSettings: options.indicatorSettings || {
        rsi: {
          period: 14,
          overbought: 65,
          oversold: 35
        },
        ema: {
          fastPeriod: 20, 
          mediumPeriod: 50,
          slowPeriod: 100
        },
        bollingerBands: {
          period: 20,
          deviation: 2
        },
        adx: {
          period: 14,
          minValue: 15
        },
        volume: {
          period: 20,
          minDeviation: 0.7
        }
      }
    };
    
    this.client = null;
    this.availablePairs = [];
    this.filteredPairs = [];
    this.scanInterval = null;
    this.isScanning = false;
    this.lastScanTime = 0;
    this.logs = [];
    this.maxLogs = 50; // Максимальное количество сообщений в логах
  }
  
  /**
   * Инициализация сканера
   * @returns {Promise<boolean>} Результат инициализации
   */
  async initialize() {
    try {
      this.log('Инициализация сканера торговых пар BitGet...', 'info');
      
      // Инициализация клиента API
      this.client = new BitGetClient({
        apiKey: this.options.apiKey,
        apiSecret: this.options.apiSecret,
        passphrase: this.options.passphrase,
        demo: this.options.demo
      });
      
      // Проверка соединения с API
      try {
        const serverTimeResponse = await this.client.getServerTime();
        this.log(`Соединение с BitGet API установлено`, 'success');
      } catch (timeError) {
        this.log(`Предупреждение: не удалось получить время сервера: ${timeError.message}`, 'warning');
      }
      
      // Получение списка доступных пар
      await this.updateAvailablePairs();
      
      this.log('Инициализация сканера завершена', 'success');
      return true;
    } catch (error) {
      this.log(`Ошибка инициализации сканера: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Запуск сканирования пар с интервалом
   * @returns {Promise<boolean>} Результат запуска
   */
  async start() {
    try {
      if (this.scanInterval) {
        this.log('Сканер уже запущен', 'warning');
        return false;
      }
      
      // Первое сканирование
      await this.scanPairs();
      
      // Запуск интервала сканирования
      this.scanInterval = setInterval(async () => {
        try {
          await this.scanPairs();
        } catch (scanError) {
          this.log(`Ошибка при периодическом сканировании: ${scanError.message}`, 'error');
        }
      }, this.options.scanInterval);
      
      this.log(`Сканер запущен с интервалом ${this.options.scanInterval / (60 * 1000)} минут`, 'success');
      return true;
    } catch (error) {
      this.log(`Ошибка при запуске сканера: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Остановка сканирования
   * @returns {boolean} Результат остановки
   */
  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      this.log('Сканер остановлен', 'info');
      return true;
    }
    
    this.log('Сканер не был запущен', 'warning');
    return false;
  }
  
  /**
   * Обновление списка доступных пар
   * @returns {Promise<Array>} Список доступных пар
   */
  async updateAvailablePairs() {
    try {
      this.log('Получение списка доступных пар...', 'info');
      
      const response = await this.client.getSymbols();
      
      if (response && response.data && Array.isArray(response.data)) {
        // Фильтруем только USDT пары для фьючерсов
        this.availablePairs = response.data
          .filter(pair => pair.symbol && pair.symbol.endsWith('USDT'))
          .map(pair => pair.symbol);
        
        this.log(`Получено ${this.availablePairs.length} доступных пар`, 'success');
        return this.availablePairs;
      } else {
        this.log('Не удалось получить список пар. Некорректный ответ API', 'error');
        throw new Error('Некорректный ответ API при получении списка пар');
      }
    } catch (error) {
      this.log(`Ошибка при получении списка пар: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Сканирование пар для поиска торговых возможностей
   * @returns {Promise<Array>} Список отфильтрованных пар
   */
  async scanPairs() {
    if (this.isScanning) {
      this.log('Сканирование уже выполняется, дождитесь завершения', 'warning');
      return this.filteredPairs;
    }
    
    this.isScanning = true;
    this.lastScanTime = Date.now();
    
    try {
      this.log('Начало сканирования торговых пар...', 'info');
      
      // Обновляем список пар, если он пуст или прошло более 12 часов
      if (this.availablePairs.length === 0 || 
          Date.now() - this.lastScanTime > 12 * 60 * 60 * 1000) {
        await this.updateAvailablePairs();
      }
      
      const pairsToScan = [...this.availablePairs];
      const analyzedPairs = [];
      
      // Анализируем каждую пару
      for (const symbol of pairsToScan) {
        try {
          this.log(`Анализ пары ${symbol}...`, 'info');
          
          // Получаем и анализируем данные для пары
          const analysisResult = await this.analyzePair(symbol);
          
          // Если пара прошла фильтры, добавляем в список
          if (analysisResult) {
            this.log(`Пара ${symbol} соответствует критериям: ${analysisResult.reason}`, 'success');
            analyzedPairs.push({
              symbol,
              score: analysisResult.score,
              analysis: analysisResult,
              timestamp: Date.now()
            });
            
            // Если набрали нужное количество пар, останавливаемся
            if (analyzedPairs.length >= this.options.maxPairs) {
              this.log(`Достигнуто максимальное количество пар (${this.options.maxPairs}), останавливаем сканирование`, 'info');
              break;
            }
          } else {
            this.log(`Пара ${symbol} не соответствует критериям`, 'info');
          }
        } catch (pairError) {
          this.log(`Ошибка при анализе пары ${symbol}: ${pairError.message}`, 'error');
        }
      }
      
      // Сортируем пары по рейтингу и выбираем лучшие
      analyzedPairs.sort((a, b) => b.score - a.score);
      this.filteredPairs = analyzedPairs.slice(0, this.options.maxPairs);
      
      // Перемешиваем выбранные пары для добавления случайности
      this.shuffleArray(this.filteredPairs);
      
      this.log(`Сканирование завершено. Найдено ${this.filteredPairs.length} перспективных пар`, 'success');
      
      // Отправляем событие об обновлении списка пар
      this.emit('pairs_updated', this.filteredPairs);
      
      return this.filteredPairs;
    } catch (error) {
      this.log(`Ошибка при сканировании пар: ${error.message}`, 'error');
      throw error;
    } finally {
      this.isScanning = false;
    }
  }
  
  /**
   * Анализ конкретной торговой пары
   * @param {string} symbol - Символ пары
   * @returns {Promise<Object|null>} Результат анализа или null если пара не прошла фильтры
   */
  async analyzePair(symbol) {
    try {
      // Получаем исторические свечи
      const candles = await this.client.getCandles(symbol, '1m', 100);
      
      if (!candles || !candles.data || candles.data.length < 50) {
        this.log(`Недостаточно исторических данных для анализа ${symbol}`, 'warning');
        return null;
      }
      
      // Форматируем свечи
      const formattedCandles = candles.data.map(candle => ({
        timestamp: Number(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
      
      // Получаем текущую цену
      const ticker = await this.client.getTicker(symbol);
      const currentPrice = parseFloat(ticker.data.last);
      
      // Рассчитываем индикаторы
      const indicators = this.calculateIndicators(formattedCandles);
      
      // Анализируем полученные индикаторы
      const analysis = this.analyzeIndicators(indicators, currentPrice, formattedCandles);
      
      // Проверяем, соответствует ли пара критериям
      if (analysis && analysis.isValid) {
        return {
          symbol,
          price: currentPrice,
          indicators,
          analysis,
          score: analysis.score,
          reason: analysis.reason
        };
      }
      
      return null;
    } catch (error) {
      this.log(`Ошибка при анализе пары ${symbol}: ${error.message}`, 'error');
      return null;
    }
  }
  
  /**
   * Расчет технических индикаторов
   * @param {Array} candles - Массив свечей
   * @returns {Object} Рассчитанные индикаторы
   */
  calculateIndicators(candles) {
    // Получаем массивы для расчета индикаторов
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    const indicators = {};
    
    // Расчет RSI
    const rsiInput = {
      values: closes,
      period: this.options.indicatorSettings.rsi.period
    };
    indicators.rsi = technicalindicators.RSI.calculate(rsiInput);
    
    // Расчет EMA
    const fastEmaInput = {
      values: closes,
      period: this.options.indicatorSettings.ema.fastPeriod
    };
    const mediumEmaInput = {
      values: closes,
      period: this.options.indicatorSettings.ema.mediumPeriod
    };
    const slowEmaInput = {
      values: closes,
      period: this.options.indicatorSettings.ema.slowPeriod
    };
    indicators.fastEma = technicalindicators.EMA.calculate(fastEmaInput);
    indicators.mediumEma = technicalindicators.EMA.calculate(mediumEmaInput);
    indicators.slowEma = technicalindicators.EMA.calculate(slowEmaInput);
    
    // Расчет Bollinger Bands
    const bbInput = {
      values: closes,
      period: this.options.indicatorSettings.bollingerBands.period,
      stdDev: this.options.indicatorSettings.bollingerBands.deviation
    };
    indicators.bb = technicalindicators.BollingerBands.calculate(bbInput);
    
    // Расчет ADX
    const adxInput = {
      high: highs,
      low: lows,
      close: closes,
      period: this.options.indicatorSettings.adx.period
    };
    indicators.adx = technicalindicators.ADX.calculate(adxInput);
    
    // Расчет среднего объема
    const volSMA = {
      values: volumes,
      period: this.options.indicatorSettings.volume.period
    };
    indicators.volumeSMA = technicalindicators.SMA.calculate(volSMA);
    
    // Расчет ATR для определения волатильности
    const atrInput = {
      high: highs,
      low: lows,
      close: closes,
      period: 14
    };
    indicators.atr = technicalindicators.ATR.calculate(atrInput);
    
    return indicators;
  }
  
  /**
   * Анализ индикаторов для определения торговых возможностей
   * @param {Object} indicators - Рассчитанные индикаторы
   * @param {number} currentPrice - Текущая цена
   * @param {Array} candles - Исторические свечи
   * @returns {Object} Результат анализа
   */
  analyzeIndicators(indicators, currentPrice, candles) {
    // Получаем последние значения индикаторов
    const currentRSI = indicators.rsi[indicators.rsi.length - 1];
    const previousRSI = indicators.rsi[indicators.rsi.length - 2];
    const fastEma = indicators.fastEma[indicators.fastEma.length - 1];
    const mediumEma = indicators.mediumEma[indicators.mediumEma.length - 1];
    const slowEma = indicators.slowEma[indicators.slowEma.length - 1];
    const previousFastEma = indicators.fastEma[indicators.fastEma.length - 2];
    const previousMediumEma = indicators.mediumEma[indicators.mediumEma.length - 2];
    
    const currentBB = indicators.bb[indicators.bb.length - 1];
    const adxValue = indicators.adx[indicators.adx.length - 1].adx;
    const currentVolume = candles[candles.length - 1].volume;
    const avgVolume = indicators.volumeSMA[indicators.volumeSMA.length - 1];
    const atrValue = indicators.atr[indicators.atr.length - 1];
    
    // Рассчитаем процентную волатильность
    const atrPercent = (atrValue / currentPrice) * 100;
    
    // Баллы для разных критериев
    let score = 0;
    const reasons = [];
    
    // Анализ RSI
    let rsiSignal = 'neutral';
    if (currentRSI < this.options.indicatorSettings.rsi.oversold) {
      if (currentRSI > previousRSI) { // RSI растет от перепроданности
        rsiSignal = 'buy';
        score += 20;
        reasons.push(`RSI (${currentRSI.toFixed(2)}) в зоне перепроданности и растет`);
      }
    } else if (currentRSI > this.options.indicatorSettings.rsi.overbought) {
      if (currentRSI < previousRSI) { // RSI падает от перекупленности
        rsiSignal = 'sell';
        score += 20;
        reasons.push(`RSI (${currentRSI.toFixed(2)}) в зоне перекупленности и падает`);
      }
    } else {
      // В нейтральной зоне, но близко к границам
      if (currentRSI > 40 && currentRSI < 45) {
        score += 5;
        reasons.push(`RSI (${currentRSI.toFixed(2)}) приближается к зоне перепроданности`);
      } else if (currentRSI > 55 && currentRSI < 60) {
        score += 5;
        reasons.push(`RSI (${currentRSI.toFixed(2)}) приближается к зоне перекупленности`);
      }
    }
    
    // Анализ EMA
    let emaSignal = 'neutral';
    // Проверка золотого креста (пересечение быстрой EMA над медленной)
    if (previousFastEma < previousMediumEma && fastEma > mediumEma) {
      emaSignal = 'buy';
      score += 25;
      reasons.push(`EMA: золотой крест (быстрая EMA пересекла медленную снизу вверх)`);
    } 
    // Проверка "мертвого креста" (пересечение быстрой EMA под медленной)
    else if (previousFastEma > previousMediumEma && fastEma < mediumEma) {
      emaSignal = 'sell';
      score += 25;
      reasons.push(`EMA: мертвый крест (быстрая EMA пересекла медленную сверху вниз)`);
    }
    // Проверка тренда
    else if (fastEma > mediumEma && mediumEma > slowEma) {
      emaSignal = 'buy';
      score += 15;
      reasons.push(`EMA: восходящий тренд (быстрая > средняя > медленная)`);
    } 
    else if (fastEma < mediumEma && mediumEma < slowEma) {
      emaSignal = 'sell';
      score += 15;
      reasons.push(`EMA: нисходящий тренд (быстрая < средняя < медленная)`);
    }
    
    // Анализ Bollinger Bands
    let bbSignal = 'neutral';
    if (currentPrice <= currentBB.lower * 1.005) { // Цена на/ниже нижней полосы (с небольшим запасом)
      bbSignal = 'buy';
      score += 15;
      reasons.push(`BB: цена (${currentPrice.toFixed(4)}) на/ниже нижней полосы Боллинджера`);
    } else if (currentPrice >= currentBB.upper * 0.995) { // Цена на/выше верхней полосы (с небольшим запасом)
      bbSignal = 'sell';
      score += 15;
      reasons.push(`BB: цена (${currentPrice.toFixed(4)}) на/выше верхней полосы Боллинджера`);
    } else {
      // Проверка сжатия полос (признак возможного сильного движения)
      const bandWidth = ((currentBB.upper - currentBB.lower) / currentBB.middle) * 100;
      if (bandWidth < 1.5) {
        score += 10;
        reasons.push(`BB: сильное сжатие полос (${bandWidth.toFixed(2)}%), возможен импульс`);
      }
    }
    
    // Анализ ADX (сила тренда)
    let adxSignal = 'not_ok';
    if (adxValue >= this.options.indicatorSettings.adx.minValue) {
      adxSignal = 'ok';
      score += 10;
      if (adxValue > 30) {
        score += 5; // Бонус за очень сильный тренд
        reasons.push(`ADX: ${adxValue.toFixed(2)} указывает на сильный тренд`);
      } else {
        reasons.push(`ADX: ${adxValue.toFixed(2)} указывает на наличие тренда`);
      }
    } else {
      // Понижаем общий рейтинг, если тренд слабый
      score -= 10;
      reasons.push(`ADX: ${adxValue.toFixed(2)} указывает на слабый тренд или его отсутствие`);
    }
    
    // Анализ объема
    let volumeSignal = 'not_ok';
    if (currentVolume >= avgVolume * this.options.indicatorSettings.volume.minDeviation) {
      volumeSignal = 'ok';
      score += 10;
      if (currentVolume > avgVolume * 1.5) {
        score += 5; // Бонус за высокий объем
        reasons.push(`Объем: текущий объем (${currentVolume.toFixed(2)}) значительно выше среднего`);
      } else {
        reasons.push(`Объем: текущий объем (${currentVolume.toFixed(2)}) выше минимального порога`);
      }
    } else {
      // Понижаем общий рейтинг при низком объеме
      score -= 5;
      reasons.push(`Объем: текущий объем (${currentVolume.toFixed(2)}) ниже минимального порога`);
    }
    
    // Анализ волатильности через ATR
    if (atrPercent > 0.3) {
      score += 5;
      reasons.push(`ATR: высокая волатильность (${atrPercent.toFixed(2)}%)`);
    } else if (atrPercent < 0.05) {
      score -= 10;
      reasons.push(`ATR: очень низкая волатильность (${atrPercent.toFixed(2)}%)`);
    }
    
    // Определение общего сигнала
    let finalSignal = null;
    let isValid = false;
    
    // LONG сигнал
    const longCondition = (rsiSignal === 'buy' || emaSignal === 'buy' || bbSignal === 'buy') && 
                         adxSignal === 'ok' && volumeSignal === 'ok';
    
    // SHORT сигнал
    const shortCondition = (rsiSignal === 'sell' || emaSignal === 'sell' || bbSignal === 'sell') && 
                         adxSignal === 'ok' && volumeSignal === 'ok';
    
    // Определяем оптимальный сигнал
    if (longCondition) {
      finalSignal = 'buy';
      isValid = true;
    } else if (shortCondition) {
      finalSignal = 'sell';
      isValid = true;
    }
    
    // Учитываем минимальный порог баллов
    if (score < 30) {
      isValid = false;
    }
    
    return {
      isValid,
      signal: finalSignal,
      score,
      reason: reasons.join(', '),
      indicators: {
        rsi: {
          value: currentRSI,
          signal: rsiSignal
        },
        ema: {
          fast: fastEma,
          medium: mediumEma,
          slow: slowEma,
          signal: emaSignal
        },
        bb: {
          upper: currentBB.upper,
          middle: currentBB.middle,
          lower: currentBB.lower,
          signal: bbSignal
        },
        adx: {
          value: adxValue,
          signal: adxSignal
        },
        volume: {
          current: currentVolume,
          average: avgVolume,
          signal: volumeSignal
        },
        atr: {
          value: atrValue,
          percent: atrPercent
        }
      }
    };
  }
  
  /**
   * Получение отфильтрованных пар
   * @param {number} limit - Ограничение количества пар
   * @returns {Array} Список отфильтрованных пар
   */
  getFilteredPairs(limit = null) {
    if (limit && limit > 0) {
      return this.filteredPairs.slice(0, limit);
    }
    return this.filteredPairs;
  }
  
  /**
   * Запуск сканирования одной конкретной пары
   * @param {string} symbol - Символ пары для анализа
   * @returns {Promise<Object|null>} Результат анализа
   */
  async scanSinglePair(symbol) {
    try {
      this.log(`Анализ отдельной пары ${symbol}...`, 'info');
      const result = await this.analyzePair(symbol);
      
      if (result) {
        this.log(`Анализ пары ${symbol} успешно завершен`, 'success');
      } else {
        this.log(`Пара ${symbol} не соответствует критериям`, 'warning');
      }
      
      return result;
    } catch (error) {
      this.log(`Ошибка при анализе пары ${symbol}: ${error.message}`, 'error');
      return null;
    }
  }
  
  /**
   * Перемешивание массива (алгоритм Фишера-Йейтса)
   * @param {Array} array - Массив для перемешивания
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    let logPrefix = '[СКАНЕР]';
    
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
   * Получение логов сканера
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

module.exports = PairScanner;
