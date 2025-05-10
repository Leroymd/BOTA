// indicators/indicator-manager.js - Управление техническими индикаторами

const technicalindicators = require('technicalindicators');

/**
 * Класс для управления техническими индикаторами
 */
class IndicatorManager {
  constructor(config) {
    this.config = config;
    this.indicators = {};
    this.historicalData = {
      candles: {},
      prices: []
    };
    this.prevPrices = []; // Предыдущие значения цены
    this.indicatorsComparison = {}; // Для сравнения значений индикаторов
    this.lookbackPeriod = 10; // Количество предыдущих значений цены для хранения
  }

  /**
   * Обновление конфигурации
   * @param {Object} newConfig - Новая конфигурация
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Инициализация с получением исторических данных
   * @param {Object} client - Экземпляр клиента API
   * @param {string} symbol - Торговая пара
   * @returns {Promise<void>}
   */
  async initialize(client, symbol) {
    try {
      console.log('Получение исторических данных для индикаторов...');
      
      // Получаем свечи для всех таймфреймов
      for (const timeframe of this.config.timeframes) {
        const candles = await client.getCandles(symbol, timeframe, 100);
        
        if (candles.data && candles.data.length > 0) {
          this.historicalData.candles[timeframe] = candles.data.map(candle => ({
            timestamp: Number(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          }));
          
          console.log(`Получено ${this.historicalData.candles[timeframe].length} свечей для таймфрейма ${timeframe}`);
        } else {
          console.error(`Не удалось получить исторические данные для ${timeframe}`);
        }
      }
      
      // Обновляем индикаторы
      await this.updateIndicators();
      console.log('Индикаторы успешно инициализированы');
      
      return true;
    } catch (error) {
      console.error('Ошибка при инициализации индикаторов:', error);
      throw error;
    }
  }

  /**
   * Обновление исторических данных
   * @param {Object} client - Экземпляр клиента API
   * @param {string} symbol - Торговая пара
   * @returns {Promise<boolean>}
   */
  async updateHistoricalData(client, symbol) {
    try {
      // Обновляем свечи для основного таймфрейма
      const timeframe = this.config.timeframes[0];
      const candles = await client.getCandles(symbol, timeframe, 100);
      
      if (candles.data && candles.data.length > 0) {
        this.historicalData.candles[timeframe] = candles.data.map(candle => ({
          timestamp: Number(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));
        
        // Сохраняем цены закрытия для анализа
        const closes = this.historicalData.candles[timeframe].map(c => c.close);
        this.historicalData.prices = closes;
        
        // Сохраняем предыдущие цены для поиска пересечений
        if (closes.length > this.lookbackPeriod) {
          this.prevPrices = closes.slice(-this.lookbackPeriod);
        } else {
          this.prevPrices = [...closes];
        }
      } else {
        console.warn('Не удалось получить свечи для обновления индикаторов');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при обновлении исторических данных:', error);
      return false;
    }
  }

  /**
   * Обновление индикаторов на основе последних данных
   * @param {number} currentPrice - Текущая цена
   * @returns {Promise<Object>} - Обновленные индикаторы
   */
  async updateIndicators(currentPrice = null) {
    try {
      // Получаем свечи для основного таймфрейма
      const timeframe = this.config.timeframes[0];
      const candles = this.historicalData.candles[timeframe];
      
      if (!candles || candles.length < 50) {
        console.warn('Недостаточно свечей для расчета индикаторов');
        return this.indicators;
      }
      
      // Получение массивов для расчета индикаторов
      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const volumes = candles.map(c => c.volume);
      
      // Последняя цена (если не предоставлена, используем цену закрытия последней свечи)
      const lastPrice = currentPrice || closes[closes.length - 1];
      
      // Расчет RSI
      if (this.config.entries && this.config.entries.rsi && this.config.entries.rsi.enabled) {
        try {
          const rsiInput = {
            values: closes,
            period: this.config.entries.rsi.period || 14
          };
          const rsiValues = technicalindicators.RSI.calculate(rsiInput);
          
          if (rsiValues && rsiValues.length > 0) {
            const currentRSI = rsiValues[rsiValues.length - 1];
            const prevRSI = rsiValues.length > 1 ? rsiValues[rsiValues.length - 2] : currentRSI;
            
            this.indicators.rsi = currentRSI;
            this.indicators.prevRsi = prevRSI;
            
            console.log(`RSI рассчитан: текущее значение ${currentRSI.toFixed(2)}`);
            
            // Сохраняем данные для сравнения
            this.indicatorsComparison.rsi = {
              value: currentRSI,
              previous: prevRSI,
              oversold: this.config.entries.rsi.oversold || 30,
              overbought: this.config.entries.rsi.overbought || 70,
              status: currentRSI < (this.config.entries.rsi.oversold || 30) ? 'buy' :
                      currentRSI > (this.config.entries.rsi.overbought || 70) ? 'sell' : 'neutral',
              message: currentRSI < (this.config.entries.rsi.oversold || 30) ? 'Перепроданность (потенциал для LONG)' :
                       currentRSI > (this.config.entries.rsi.overbought || 70) ? 'Перекупленность (потенциал для SHORT)' : 'Нейтральная зона'
            };
          }
        } catch (rsiError) {
          console.error('Ошибка при расчете RSI:', rsiError);
        }
      }
      
      // Расчет EMA
      if (this.config.entries && this.config.entries.ema && this.config.entries.ema.enabled) {
        try {
          const fastEmaInput = {
            values: closes,
            period: this.config.entries.ema.fastPeriod || 20
          };
          const slowEmaInput = {
            values: closes,
            period: this.config.entries.ema.slowPeriod || 100
          };
          const fastEmaValues = technicalindicators.EMA.calculate(fastEmaInput);
          const slowEmaValues = technicalindicators.EMA.calculate(slowEmaInput);
          
          if (fastEmaValues && fastEmaValues.length > 0 && 
              slowEmaValues && slowEmaValues.length > 0) {
            const fastEMA = fastEmaValues[fastEmaValues.length - 1];
            const slowEMA = slowEmaValues[slowEmaValues.length - 1];
            const prevFastEMA = fastEmaValues.length > 1 ? fastEmaValues[fastEmaValues.length - 2] : fastEMA;
            const prevSlowEMA = slowEmaValues.length > 1 ? slowEmaValues[slowEmaValues.length - 2] : slowEMA;
            
            this.indicators.ema = {
              fast: fastEMA,
              slow: slowEMA,
              prevFast: prevFastEMA,
              prevSlow: prevSlowEMA
            };
            
            console.log(`EMA рассчитаны: быстрая=${fastEMA.toFixed(2)}, медленная=${slowEMA.toFixed(2)}`);
            
            // Сохраняем данные для сравнения
            this.indicatorsComparison.ema = {
              fast: fastEMA,
              slow: slowEMA,
              prevFast: prevFastEMA,
              prevSlow: prevSlowEMA,
              status: fastEMA > slowEMA ? 'buy' : 
                      fastEMA < slowEMA ? 'sell' : 'neutral',
              message: fastEMA > slowEMA ? 'Быстрая EMA выше медленной (восходящий тренд)' :
                       fastEMA < slowEMA ? 'Быстрая EMA ниже медленной (нисходящий тренд)' : 'Пересечение EMA (нейтрально)'
            };
          }
        } catch (emaError) {
          console.error('Ошибка при расчете EMA:', emaError);
        }
      }
      
      // Расчет Bollinger Bands
      if (this.config.entries && this.config.entries.bollingerBands && this.config.entries.bollingerBands.enabled) {
        try {
          const bbInput = {
            values: closes,
            period: this.config.entries.bollingerBands.period || 20,
            stdDev: this.config.entries.bollingerBands.deviation || 2
          };
          const bbValues = technicalindicators.BollingerBands.calculate(bbInput);
          
          if (bbValues && bbValues.length > 0) {
            const lastBB = bbValues[bbValues.length - 1];
            
            this.indicators.bb = {
              upper: lastBB.upper,
              middle: lastBB.middle,
              lower: lastBB.lower
            };
            
            console.log(`Bollinger Bands рассчитаны: верхняя=${lastBB.upper.toFixed(2)}, средняя=${lastBB.middle.toFixed(2)}, нижняя=${lastBB.lower.toFixed(2)}`);
            
            // Сохраняем данные для сравнения
            this.indicatorsComparison.bb = {
              upper: lastBB.upper,
              middle: lastBB.middle,
              lower: lastBB.lower,
              price: lastPrice,
              status: lastPrice <= lastBB.lower * 1.01 ? 'buy' : 
                      lastPrice >= lastBB.upper * 0.99 ? 'sell' : 'neutral',
              message: lastPrice <= lastBB.lower * 1.01 ? 'Цена на/ниже нижней полосы (потенциал для LONG)' :
                       lastPrice >= lastBB.upper * 0.99 ? 'Цена на/выше верхней полосы (потенциал для SHORT)' : 'Цена внутри полос Боллинджера'
            };
          }
        } catch (bbError) {
          console.error('Ошибка при расчете Bollinger Bands:', bbError);
        }
      }
      
      // Расчет ADX (сила тренда)
      if (this.config.filters && this.config.filters.adx && this.config.filters.adx.enabled) {
        try {
          const adxInput = {
            high: highs,
            low: lows,
            close: closes,
            period: this.config.filters.adx.period || 14
          };
          const adxValues = technicalindicators.ADX.calculate(adxInput);
          
          if (adxValues && adxValues.length > 0) {
            const lastADX = adxValues[adxValues.length - 1];
            
            this.indicators.adx = lastADX.adx;
            
            console.log(`ADX рассчитан: текущее значение ${lastADX.adx.toFixed(2)}`);
            
            // Сохраняем данные для сравнения
            this.indicatorsComparison.adx = {
              value: lastADX.adx,
              minValue: this.config.filters.adx.minValue || 15,
              status: lastADX.adx >= (this.config.filters.adx.minValue || 15) ? 'ok' : 'not_ok',
              message: lastADX.adx >= 25 ? 'Сильный тренд' : 
                       lastADX.adx >= (this.config.filters.adx.minValue || 15) ? 'Умеренный тренд' : 'Слабый или отсутствующий тренд'
            };
          }
        } catch (adxError) {
          console.error('Ошибка при расчете ADX:', adxError);
        }
      }
      
      // Расчет среднего объема
      if (this.config.filters && this.config.filters.volume && this.config.filters.volume.enabled) {
        try {
          const volSMA = {
            values: volumes,
            period: 20
          };
          const volumeSMAValues = technicalindicators.SMA.calculate(volSMA);
          
          if (volumeSMAValues && volumeSMAValues.length > 0) {
            const avgVolume = volumeSMAValues[volumeSMAValues.length - 1];
            const currentVolume = volumes[volumes.length - 1];
            const minRequiredVolume = avgVolume * (this.config.filters.volume.minimumVolume || 0.5);
            
            this.indicators.volumeSMA = avgVolume;
            this.indicators.currentVolume = currentVolume;
            
            console.log(`Средний объем рассчитан: ${avgVolume.toFixed(2)}, текущий: ${currentVolume.toFixed(2)}`);
            
            // Сохраняем данные для сравнения
            this.indicatorsComparison.volume = {
              current: currentVolume,
              average: avgVolume,
              minDeviation: this.config.filters.volume.minimumVolume || 0.5,
              status: currentVolume >= minRequiredVolume ? 'ok' : 'not_ok',
              message: currentVolume >= avgVolume * 1.5 ? 'Очень высокий объем (возможен сильный импульс)' :
                       currentVolume >= minRequiredVolume ? 'Достаточный объем' : 'Недостаточный объем'
            };
          }
        } catch (volumeError) {
          console.error('Ошибка при расчете среднего объема:', volumeError);
        }
      }
      
      // Расчет Price Action Channel (PAC)
      // Это EMA(34) от High, Low и Close для создания канала цены
      try {
        const highEmaInput = {
          values: highs,
          period: 34
        };
        const lowEmaInput = {
          values: lows,
          period: 34
        };
        const closeEmaInput = {
          values: closes,
          period: 34
        };
        
        const highEmaValues = technicalindicators.EMA.calculate(highEmaInput);
        const lowEmaValues = technicalindicators.EMA.calculate(lowEmaInput);
        const closeEmaValues = technicalindicators.EMA.calculate(closeEmaInput);
        
        if (highEmaValues && highEmaValues.length > 0 && 
            lowEmaValues && lowEmaValues.length > 0 && 
            closeEmaValues && closeEmaValues.length > 0) {
          const pacUpper = highEmaValues[highEmaValues.length - 1];
          const pacLower = lowEmaValues[lowEmaValues.length - 1];
          const pacCenter = closeEmaValues[closeEmaValues.length - 1];
          
          // Предыдущие значения PAC
          const prevPacCenters = closeEmaValues.slice(-this.lookbackPeriod);
          
          this.indicators.pac = {
            upper: pacUpper,
            center: pacCenter,
            lower: pacLower,
            prevCenters: prevPacCenters
          };
          
          console.log(`PAC рассчитан: верхний=${pacUpper.toFixed(2)}, центр=${pacCenter.toFixed(2)}, нижний=${pacLower.toFixed(2)}`);
          
          // Определяем тренд на основе PAC
          let pacStatus = 'neutral';
          let pacMessage = 'Нейтральное положение';
          
          if (lastPrice > pacUpper) {
            pacStatus = 'buy';
            pacMessage = 'Цена выше верхней границы PAC (сильный бычий тренд)';
          } else if (lastPrice < pacLower) {
            pacStatus = 'sell';
            pacMessage = 'Цена ниже нижней границы PAC (сильный медвежий тренд)';
          } else if (lastPrice > pacCenter) {
            pacStatus = 'buy_weak';
            pacMessage = 'Цена выше центра PAC (слабый бычий тренд)';
          } else if (lastPrice < pacCenter) {
            pacStatus = 'sell_weak';
            pacMessage = 'Цена ниже центра PAC (слабый медвежий тренд)';
          }
          
          // Проверяем наличие откатов (pullbacks)
          let pullbackDetected = false;
          let pullbackType = null;
          
          // Для лонга: цена была ниже центра PAC, а теперь вернулась выше (отскок)
          const longPullback = this.prevPrices.some((price, index) => {
            if (index < this.prevPrices.length - 1 && index < prevPacCenters.length - 1) {
              return price < prevPacCenters[index] && this.prevPrices[index + 1] > prevPacCenters[index + 1];
            }
            return false;
          });
          
          // Для шорта: цена была выше центра PAC, а теперь вернулась ниже (отскок)
          const shortPullback = this.prevPrices.some((price, index) => {
            if (index < this.prevPrices.length - 1 && index < prevPacCenters.length - 1) {
              return price > prevPacCenters[index] && this.prevPrices[index + 1] < prevPacCenters[index + 1];
            }
            return false;
          });
          
          if (longPullback && lastPrice > pacCenter) {
            pullbackDetected = true;
            pullbackType = 'buy';
            pacMessage = 'Обнаружен отскок вверх от центра PAC (сигнал на покупку)';
          } else if (shortPullback && lastPrice < pacCenter) {
            pullbackDetected = true;
            pullbackType = 'sell';
            pacMessage = 'Обнаружен отскок вниз от центра PAC (сигнал на продажу)';
          }
          
          // Сохраняем данные для сравнения
          this.indicatorsComparison.pac = {
            upper: pacUpper,
            center: pacCenter,
            lower: pacLower,
            price: lastPrice,
            status: pullbackDetected ? pullbackType : pacStatus,
            pullbackDetected: pullbackDetected,
            message: pacMessage
          };
        }
      } catch (pacError) {
        console.error('Ошибка при расчете PAC:', pacError);
      }
      
      // Добавляем цену и предыдущие цены
      this.indicators.currentPrice = lastPrice;
      this.indicators.prevPrices = this.prevPrices;
      
      // Определение финального сигнала на основе всех индикаторов
      this.determineOverallSignal(lastPrice);
      
      return this.indicators;
    } catch (error) {
      console.error('Ошибка при обновлении индикаторов:', error);
      return this.indicators;
    }
  }

  /**
   * Определение общего сигнала на основе всех индикаторов
   * @param {number} currentPrice - Текущая цена
   */
  determineOverallSignal(currentPrice) {
    try {
      // Веса индикаторов для взвешенного голосования
      const weights = {
        pac: 35,   // Price Action Channel имеет наибольший вес (35%)
        ema: 25,   // EMA тренд (25%)
        rsi: 15,   // RSI (15%)
        bb: 10,    // Bollinger Bands (10%)
        adx: 10,   // ADX (сила тренда) (10%)
        volume: 5  // Объем (5%)
      };
      
      let longScore = 0;
      let shortScore = 0;
      let totalWeight = 0;
      
      // Анализ PAC
      if (this.indicatorsComparison.pac) {
        totalWeight += weights.pac;
        const pacStatus = this.indicatorsComparison.pac.status;
        
        if (pacStatus === 'buy' || pacStatus === 'buy_weak') {
          longScore += weights.pac * (pacStatus === 'buy' ? 1 : 0.7);
        } else if (pacStatus === 'sell' || pacStatus === 'sell_weak') {
          shortScore += weights.pac * (pacStatus === 'sell' ? 1 : 0.7);
        }
      }
      
      // Анализ EMA
      if (this.indicatorsComparison.ema) {
        totalWeight += weights.ema;
        const emaStatus = this.indicatorsComparison.ema.status;
        
        if (emaStatus === 'buy') {
          longScore += weights.ema;
        } else if (emaStatus === 'sell') {
          shortScore += weights.ema;
        }
      }
      
      // Анализ RSI
      if (this.indicatorsComparison.rsi) {
        totalWeight += weights.rsi;
        const rsiStatus = this.indicatorsComparison.rsi.status;
        
        if (rsiStatus === 'buy') {
          longScore += weights.rsi;
        } else if (rsiStatus === 'sell') {
          shortScore += weights.rsi;
        }
      }
      
      // Анализ Bollinger Bands
      if (this.indicatorsComparison.bb) {
        totalWeight += weights.bb;
        const bbStatus = this.indicatorsComparison.bb.status;
        
        if (bbStatus === 'buy') {
          longScore += weights.bb;
        } else if (bbStatus === 'sell') {
          shortScore += weights.bb;
        }
      }
      
      // Учитываем ADX (влияет на силу сигнала)
      let adxMultiplier = 1.0;
      if (this.indicatorsComparison.adx) {
        totalWeight += weights.adx;
        const adxValue = this.indicatorsComparison.adx.value;
        
        if (adxValue >= 25) {
          // Сильный тренд - увеличиваем вес сигнала
          adxMultiplier = 1.2;
          longScore += weights.adx;
          shortScore += weights.adx;
        } else if (adxValue >= 15) {
          // Умеренный тренд - нормальный вес
          adxMultiplier = 1.0;
          longScore += weights.adx * 0.7;
          shortScore += weights.adx * 0.7;
        } else {
          // Слабый тренд - уменьшаем вес сигнала
          adxMultiplier = 0.8;
        }
      }
      
      // Учитываем объем
      if (this.indicatorsComparison.volume) {
        totalWeight += weights.volume;
        const volumeStatus = this.indicatorsComparison.volume.status;
        
        if (volumeStatus === 'ok') {
          longScore += weights.volume;
          shortScore += weights.volume;
        }
      }
      
      // Применяем ADX мультипликатор
      longScore *= adxMultiplier;
      shortScore *= adxMultiplier;
      
      // Нормализуем оценки
      if (totalWeight > 0) {
        longScore = (longScore / totalWeight) * 100;
        shortScore = (shortScore / totalWeight) * 100;
      }
      
      // Определяем финальный сигнал
      let finalStatus = 'not_ready';
      let finalMessage = 'Недостаточно сигналов для входа в позицию';
      const thresholdScore = 60; // Минимальный порог уверенности для сигнала
      
      if (longScore >= thresholdScore && longScore > shortScore) {
        finalStatus = 'buy';
        finalMessage = `Сигнал на покупку с уверенностью ${longScore.toFixed(1)}%`;
      } else if (shortScore >= thresholdScore && shortScore > longScore) {
        finalStatus = 'sell';
        finalMessage = `Сигнал на продажу с уверенностью ${shortScore.toFixed(1)}%`;
      }
      
      this.indicatorsComparison.finalSignal = {
        status: finalStatus,
        longScore: longScore,
        shortScore: shortScore,
        message: finalMessage
      };
      
    } catch (error) {
      console.error('Ошибка при определении общего сигнала:', error);
    }
  }

  /**
   * Получение текущих индикаторов
   * @returns {Object} - Текущие значения индикаторов
   */
  getCurrentIndicators() {
    return this.indicators;
  }

  /**
   * Получение данных сравнения индикаторов
   * @returns {Object} - Данные сравнения
   */
  getIndicatorsComparison() {
    return this.indicatorsComparison;
  }
}

module.exports = IndicatorManager;
