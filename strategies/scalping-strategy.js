// strategies/scalping-strategy.js - Реализация стратегии скальпинга

/**
 * Класс для реализации стратегии скальпинга на основе PineScript
 */
class ScalpingStrategy {
  constructor(config, indicatorManager, positionManager) {
    this.config = config;
    this.indicatorManager = indicatorManager;
    this.positionManager = positionManager;
    this.client = null;
    this.confidence = 0; // Уровень уверенности в тренде (0-100%)
    this.lastSignalTime = 0; // Время последнего сигнала
    this.minIntervalBetweenTrades = 1 * 60 * 1000; // Минимальный интервал между сделками в мс (1 минута)
    
    // Использовать индикаторы как условие (true) или как рекомендацию (false)
    this.indicatorsAsRequirement = config.indicatorsAsRequirement !== undefined ? config.indicatorsAsRequirement : false;
  }

  /**
   * Установка клиента API
   * @param {Object} client - Экземпляр BitGetClient
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Обновление конфигурации
   * @param {Object} newConfig - Новая конфигурация
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.indicatorsAsRequirement !== undefined) {
      this.indicatorsAsRequirement = newConfig.indicatorsAsRequirement;
    }
  }

  /**
   * Расчет уровня уверенности в сигнале на основе индикаторов
   * @param {Object} indicators - Текущие индикаторы
   * @param {string} signalType - Тип сигнала (LONG или SHORT)
   * @returns {number} - Уровень уверенности (0-100%)
   */
  calculateConfidence(indicators, signalType) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // Веса индикаторов (всего должно быть 100%)
    const weights = {
      rsi: 20,   // RSI 20%
      ema: 25,   // EMA тренд 25%
      pac: 25,   // Price Action Channel 25%
      bb: 15,    // Bollinger Bands 15%
      adx: 15    // ADX (сила тренда) 15%
    };
    
    // Проверка RSI
    if (indicators.rsi !== undefined) {
      maxPossibleScore += weights.rsi;
      
      if (signalType === 'LONG' && indicators.rsi < 40 && indicators.rsi > indicators.prevRsi) {
        // RSI в зоне перепроданности и растет - хороший сигнал для покупки
        totalScore += weights.rsi;
      } else if (signalType === 'SHORT' && indicators.rsi > 60 && indicators.rsi < indicators.prevRsi) {
        // RSI в зоне перекупленности и падает - хороший сигнал для продажи
        totalScore += weights.rsi;
      } else if (signalType === 'LONG' && indicators.rsi < 50) {
        // RSI ниже 50, потенциал для роста
        totalScore += weights.rsi * 0.7;
      } else if (signalType === 'SHORT' && indicators.rsi > 50) {
        // RSI выше 50, потенциал для падения
        totalScore += weights.rsi * 0.7;
      }
    }
    
    // Проверка EMA
    if (indicators.ema !== undefined) {
      maxPossibleScore += weights.ema;
      
      if (signalType === 'LONG' && indicators.ema.fast > indicators.ema.slow) {
        // Быстрая EMA выше медленной - восходящий тренд
        totalScore += weights.ema;
      } else if (signalType === 'SHORT' && indicators.ema.fast < indicators.ema.slow) {
        // Быстрая EMA ниже медленной - нисходящий тренд
        totalScore += weights.ema;
      } else if (signalType === 'LONG' && indicators.ema.fast > indicators.ema.prevFast) {
        // Быстрая EMA растет - потенциал для восходящего тренда
        totalScore += weights.ema * 0.5;
      } else if (signalType === 'SHORT' && indicators.ema.fast < indicators.ema.prevFast) {
        // Быстрая EMA падает - потенциал для нисходящего тренда
        totalScore += weights.ema * 0.5;
      }
    }
    
    // Проверка Price Action Channel (PAC)
    if (indicators.pac !== undefined) {
      maxPossibleScore += weights.pac;
      
      if (signalType === 'LONG' && indicators.currentPrice > indicators.pac.center) {
        // Цена выше центральной линии PAC - признак восходящего тренда
        const distanceAbovePercent = (indicators.currentPrice - indicators.pac.center) / indicators.pac.center * 100;
        
        if (distanceAbovePercent < 0.2) {
          // Цена немного выше центра - хороший момент для входа
          totalScore += weights.pac;
        } else if (distanceAbovePercent < 0.5) {
          // Цена умеренно выше центра - всё еще неплохо
          totalScore += weights.pac * 0.8;
        } else {
          // Цена далеко от центра - уже не лучший момент для входа
          totalScore += weights.pac * 0.5;
        }
      } else if (signalType === 'SHORT' && indicators.currentPrice < indicators.pac.center) {
        // Цена ниже центральной линии PAC - признак нисходящего тренда
        const distanceBelowPercent = (indicators.pac.center - indicators.currentPrice) / indicators.pac.center * 100;
        
        if (distanceBelowPercent < 0.2) {
          // Цена немного ниже центра - хороший момент для входа
          totalScore += weights.pac;
        } else if (distanceBelowPercent < 0.5) {
          // Цена умеренно ниже центра - всё еще неплохо
          totalScore += weights.pac * 0.8;
        } else {
          // Цена далеко от центра - уже не лучший момент для входа
          totalScore += weights.pac * 0.5;
        }
      }
    }
    
    // Проверка Bollinger Bands
    if (indicators.bb !== undefined) {
      maxPossibleScore += weights.bb;
      
      if (signalType === 'LONG' && indicators.currentPrice <= indicators.bb.lower * 1.01) {
        // Цена на/ниже нижней полосы Боллинджера - потенциал для отскока вверх
        totalScore += weights.bb;
      } else if (signalType === 'SHORT' && indicators.currentPrice >= indicators.bb.upper * 0.99) {
        // Цена на/выше верхней полосы Боллинджера - потенциал для отскока вниз
        totalScore += weights.bb;
      } else if (signalType === 'LONG' && indicators.currentPrice < indicators.bb.middle) {
        // Цена ниже средней полосы - потенциал для роста
        totalScore += weights.bb * 0.5;
      } else if (signalType === 'SHORT' && indicators.currentPrice > indicators.bb.middle) {
        // Цена выше средней полосы - потенциал для падения
        totalScore += weights.bb * 0.5;
      }
    }
    
    // Проверка ADX (сила тренда)
    if (indicators.adx !== undefined) {
      maxPossibleScore += weights.adx;
      
      // ADX показывает силу тренда, независимо от его направления
      if (indicators.adx >= 25) {
        // Сильный тренд
        totalScore += weights.adx;
      } else if (indicators.adx >= 20) {
        // Умеренный тренд
        totalScore += weights.adx * 0.8;
      } else if (indicators.adx >= 15) {
        // Слабый тренд
        totalScore += weights.adx * 0.5;
      }
    }
    
    // Рассчитываем процент уверенности
    const confidenceLevel = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    return Math.round(confidenceLevel);
  }

  /**
   * Проверка условий для входа в позицию
   * @param {Object} indicators - Текущие индикаторы
   * @returns {Object|null} - Сигнал для входа или null
   */
  checkEntryConditions(indicators) {
    // Проверяем, прошло ли достаточно времени с последнего сигнала
    const now = Date.now();
    if (now - this.lastSignalTime < this.minIntervalBetweenTrades) {
      return null;
    }
    
    // Базовые сигналы для входа в лонг или шорт
    let longSignal = false;
    let shortSignal = false;
    
    // Проверка на Price Action Channel (PAC)
    if (indicators.pac && indicators.prevPrices) {
      // Проверяем, был ли пул-бэк с пересечением центра PAC
      const currentAboveCenter = indicators.currentPrice > indicators.pac.center;
      const prevCrossedBelowCenter = indicators.prevPrices.some((price, index) => {
        if (index < indicators.prevPrices.length - 1) {
          return price < indicators.pac.prevCenters[index] && indicators.prevPrices[index + 1] > indicators.pac.prevCenters[index + 1];
        }
        return false;
      });
      
      const currentBelowCenter = indicators.currentPrice < indicators.pac.center;
      const prevCrossedAboveCenter = indicators.prevPrices.some((price, index) => {
        if (index < indicators.prevPrices.length - 1) {
          return price > indicators.pac.prevCenters[index] && indicators.prevPrices[index + 1] < indicators.pac.prevCenters[index + 1];
        }
        return false;
      });
      
      // Сигнал на лонг: 
      // - Текущая цена выше центра PAC 
      // - В недавней истории было пересечение центра PAC снизу вверх
      // - Если есть EMA, то быстрая EMA должна быть выше медленной (подтверждение тренда)
      if (currentAboveCenter && prevCrossedBelowCenter && 
          (!indicators.ema || indicators.ema.fast >= indicators.ema.slow)) {
        longSignal = true;
      }
      
      // Сигнал на шорт: 
      // - Текущая цена ниже центра PAC 
      // - В недавней истории было пересечение центра PAC сверху вниз
      // - Если есть EMA, то быстрая EMA должна быть ниже медленной (подтверждение тренда)
      else if (currentBelowCenter && prevCrossedAboveCenter && 
               (!indicators.ema || indicators.ema.fast <= indicators.ema.slow)) {
        shortSignal = true;
      }
    }
    
    // Альтернативная проверка на базе EMA и RSI при отсутствии PAC
    if (!indicators.pac && indicators.ema && indicators.rsi) {
      // Сигнал на лонг:
      // - Быстрая EMA выше медленной (восходящий тренд)
      // - RSI находится в зоне перепроданности и растет
      if (indicators.ema.fast > indicators.ema.slow && 
          indicators.rsi < 40 && indicators.rsi > indicators.prevRsi) {
        longSignal = true;
      }
      
      // Сигнал на шорт:
      // - Быстрая EMA ниже медленной (нисходящий тренд)
      // - RSI находится в зоне перекупленности и падает
      else if (indicators.ema.fast < indicators.ema.slow && 
               indicators.rsi > 60 && indicators.rsi < indicators.prevRsi) {
        shortSignal = true;
      }
    }
    
    // Если индикаторы используются как рекомендация, а не строгое условие
    if (!this.indicatorsAsRequirement) {
      // Дополнительная проверка на Bollinger Bands для усиления сигнала
      if (indicators.bb) {
        // Цена на/ниже нижней полосы Боллинджера - сигнал на лонг
        if (indicators.currentPrice <= indicators.bb.lower * 1.01) {
          longSignal = true;
        }
        // Цена на/выше верхней полосы Боллинджера - сигнал на шорт
        else if (indicators.currentPrice >= indicators.bb.upper * 0.99) {
          shortSignal = true;
        }
      }
    } else {
      // Если индикаторы как условие, проверяем дополнительные фильтры
      
      // Проверка ADX (сила тренда)
      if (indicators.adx && indicators.adx < 15) {
        // Слишком слабый тренд - отменяем сигналы
        longSignal = false;
        shortSignal = false;
      }
      
      // Проверка на соответствие RSI тренду
      if (indicators.rsi) {
        // Для лонга RSI не должен быть в зоне перекупленности
        if (longSignal && indicators.rsi > 70) {
          longSignal = false;
        }
        // Для шорта RSI не должен быть в зоне перепроданности
        if (shortSignal && indicators.rsi < 30) {
          shortSignal = false;
        }
      }
    }
    
    // Формируем сигнал, если условия выполнены
    if (longSignal || shortSignal) {
      const signalType = longSignal ? 'LONG' : 'SHORT';
      const confidenceLevel = this.calculateConfidence(indicators, signalType);
      
      // Если используем как условие, проверяем минимальный порог уверенности
      if (this.indicatorsAsRequirement && confidenceLevel < 60) {
        console.log(`Недостаточный уровень уверенности для ${signalType}: ${confidenceLevel}%`);
        return null;
      }
      
      this.lastSignalTime = now;
      this.confidence = confidenceLevel;
      
      return {
        type: signalType,
        price: indicators.currentPrice,
        timestamp: now,
        confidenceLevel: confidenceLevel,
        reason: `Скальпинг: ${signalType} сигнал, уверенность: ${confidenceLevel}%`
      };
    }
    
    return null;
  }

  /**
   * Выполнение стратегии торговли
   * @param {number} currentPrice - Текущая цена
   * @returns {Promise<void>}
   */
  async execute(currentPrice) {
    if (!this.client || !currentPrice) return;
    
    try {
      // Получаем текущие позиции
      const openPositions = this.positionManager.getOpenPositions();
      
      // Проверяем, что не превышено максимальное количество позиций
      if (openPositions.length >= this.config.riskManagement.maxOpenPositions) {
        return;
      }
      
      // Получаем текущие значения индикаторов
      const indicators = this.indicatorManager.getCurrentIndicators();
      indicators.currentPrice = currentPrice;
      
      // Проверяем условия для входа
      const signal = this.checkEntryConditions(indicators);
      
      if (signal) {
        console.log(`Получен сигнал ${signal.type} с уверенностью ${signal.confidenceLevel}% по цене ${currentPrice}`);
        
        // Вызываем метод для создания позиции
        await this.positionManager.openPosition(
          signal.type,
          currentPrice,
          signal.reason,
          signal.confidenceLevel
        );
      }
    } catch (error) {
      console.error('Ошибка при исполнении стратегии:', error);
    }
  }
}

module.exports = ScalpingStrategy;
