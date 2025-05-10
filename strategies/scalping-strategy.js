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
   * Логирование сообщений стратегии
   * @param {string} message - Сообщение для логирования
   * @param {string} level - Уровень (info, warning, error, success)
   */
  log(message, level = 'info') {
    // Отправляем событие с логом, если клиент поддерживает события
    if (this.client && typeof this.client.emit === 'function') {
      this.client.emit('log_update', {
        timestamp: new Date().getTime(),
        message,
        category: 'trading',
        level
      });
    }
    
    // Дублируем в консоль для отладки
    if (level === 'error') {
      console.error(`[СТРАТЕГИЯ] ${message}`);
    } else if (level === 'warning') {
      console.warn(`[СТРАТЕГИЯ] ${message}`);
    } else {
      console.log(`[СТРАТЕГИЯ] ${message}`);
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
        this.log(`RSI (${indicators.rsi.toFixed(2)}) в зоне перепроданности и растет - положительный фактор для LONG`);
      } else if (signalType === 'SHORT' && indicators.rsi > 60 && indicators.rsi < indicators.prevRsi) {
        // RSI в зоне перекупленности и падает - хороший сигнал для продажи
        totalScore += weights.rsi;
        this.log(`RSI (${indicators.rsi.toFixed(2)}) в зоне перекупленности и падает - положительный фактор для SHORT`);
      } else if (signalType === 'LONG' && indicators.rsi < 50) {
        // RSI ниже 50, потенциал для роста
        totalScore += weights.rsi * 0.7;
        this.log(`RSI (${indicators.rsi.toFixed(2)}) ниже 50 - умеренно положительный фактор для LONG`);
      } else if (signalType === 'SHORT' && indicators.rsi > 50) {
        // RSI выше 50, потенциал для падения
        totalScore += weights.rsi * 0.7;
        this.log(`RSI (${indicators.rsi.toFixed(2)}) выше 50 - умеренно положительный фактор для SHORT`);
      } else {
        if (signalType === 'LONG') {
          this.log(`RSI (${indicators.rsi.toFixed(2)}) не подтверждает LONG сигнал`);
        } else {
          this.log(`RSI (${indicators.rsi.toFixed(2)}) не подтверждает SHORT сигнал`);
        }
      }
    }
    
    // Проверка EMA
    if (indicators.ema !== undefined) {
      maxPossibleScore += weights.ema;
      
      if (signalType === 'LONG' && indicators.ema.fast > indicators.ema.slow) {
        // Быстрая EMA выше медленной - восходящий тренд
        totalScore += weights.ema;
        this.log(`EMA: быстрая (${indicators.ema.fast.toFixed(2)}) > медленная (${indicators.ema.slow.toFixed(2)}) - восходящий тренд, положительный фактор для LONG`);
      } else if (signalType === 'SHORT' && indicators.ema.fast < indicators.ema.slow) {
        // Быстрая EMA ниже медленной - нисходящий тренд
        totalScore += weights.ema;
        this.log(`EMA: быстрая (${indicators.ema.fast.toFixed(2)}) < медленная (${indicators.ema.slow.toFixed(2)}) - нисходящий тренд, положительный фактор для SHORT`);
      } else if (signalType === 'LONG' && indicators.ema.fast > indicators.ema.prevFast) {
        // Быстрая EMA растет - потенциал для восходящего тренда
        totalScore += weights.ema * 0.5;
        this.log(`EMA: быстрая растет (${indicators.ema.prevFast.toFixed(2)} -> ${indicators.ema.fast.toFixed(2)}) - потенциал для восходящего тренда, умеренно положительный фактор для LONG`);
      } else if (signalType === 'SHORT' && indicators.ema.fast < indicators.ema.prevFast) {
        // Быстрая EMA падает - потенциал для нисходящего тренда
        totalScore += weights.ema * 0.5;
        this.log(`EMA: быстрая падает (${indicators.ema.prevFast.toFixed(2)} -> ${indicators.ema.fast.toFixed(2)}) - потенциал для нисходящего тренда, умеренно положительный фактор для SHORT`);
      } else {
        if (signalType === 'LONG') {
          this.log(`EMA не подтверждает LONG сигнал: быстрая (${indicators.ema.fast.toFixed(2)}) < медленная (${indicators.ema.slow.toFixed(2)})`);
        } else {
          this.log(`EMA не подтверждает SHORT сигнал: быстрая (${indicators.ema.fast.toFixed(2)}) > медленная (${indicators.ema.slow.toFixed(2)})`);
        }
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
          this.log(`PAC: цена (${indicators.currentPrice.toFixed(6)}) немного выше центра (${indicators.pac.center.toFixed(6)}) на ${distanceAbovePercent.toFixed(2)}% - отличный момент для LONG`);
        } else if (distanceAbovePercent < 0.5) {
          // Цена умеренно выше центра - всё еще неплохо
          totalScore += weights.pac * 0.8;
          this.log(`PAC: цена (${indicators.currentPrice.toFixed(6)}) умеренно выше центра (${indicators.pac.center.toFixed(6)}) на ${distanceAbovePercent.toFixed(2)}% - хороший момент для LONG`);
        } else {
          // Цена далеко от центра - уже не лучший момент для входа
          totalScore += weights.pac * 0.5;
          this.log(`PAC: цена (${indicators.currentPrice.toFixed(6)}) существенно выше центра (${indicators.pac.center.toFixed(6)}) на ${distanceAbovePercent.toFixed(2)}% - не лучший момент для LONG`);
        }
      } else if (signalType === 'SHORT' && indicators.currentPrice < indicators.pac.center) {
        // Цена ниже центральной линии PAC - признак нисходящего тренда
        const distanceBelowPercent = (indicators.pac.center - indicators.currentPrice) / indicators.pac.center * 100;
        
        if (distanceBelowPercent < 0.2) {
          // Цена немного ниже центра - хороший момент для входа
          totalScore += weights.pac;
          this.log(`PAC: цена (${indicators.currentPrice.toFixed(6)}) немного ниже центра (${indicators.pac.center.toFixed(6)}) на ${distanceBelowPercent.toFixed(2)}% - отличный момент для SHORT`);
        } else if (distanceBelowPercent < 0.5) {
          // Цена умеренно ниже центра - всё еще неплохо
          totalScore += weights.pac * 0.8;
          this.log(`PAC: цена (${indicators.currentPrice.toFixed(6)}) умеренно ниже центра (${indicators.pac.center.toFixed(6)}) на ${distanceBelowPercent.toFixed(2)}% - хороший момент для SHORT`);
        } else {
          // Цена далеко от центра - уже не лучший момент для входа
          totalScore += weights.pac * 0.5;
          this.log(`PAC: цена (${indicators.currentPrice.toFixed(6)}) существенно ниже центра (${indicators.pac.center.toFixed(6)}) на ${distanceBelowPercent.toFixed(2)}% - не лучший момент для SHORT`);
        }
      } else {
        if (signalType === 'LONG') {
          this.log(`PAC не подтверждает LONG сигнал: цена (${indicators.currentPrice.toFixed(6)}) ниже центра (${indicators.pac.center.toFixed(6)})`);
        } else {
          this.log(`PAC не подтверждает SHORT сигнал: цена (${indicators.currentPrice.toFixed(6)}) выше центра (${indicators.pac.center.toFixed(6)})`);
        }
      }
    }
    
    // Проверка Bollinger Bands
    if (indicators.bb !== undefined) {
      maxPossibleScore += weights.bb;
      
      if (signalType === 'LONG' && indicators.currentPrice <= indicators.bb.lower * 1.01) {
        // Цена на/ниже нижней полосы Боллинджера - потенциал для отскока вверх
        totalScore += weights.bb;
        this.log(`BB: цена (${indicators.currentPrice.toFixed(6)}) на/ниже нижней полосы (${indicators.bb.lower.toFixed(6)}) - сильный сигнал для LONG`);
      } else if (signalType === 'SHORT' && indicators.currentPrice >= indicators.bb.upper * 0.99) {
        // Цена на/выше верхней полосы Боллинджера - потенциал для отскока вниз
        totalScore += weights.bb;
        this.log(`BB: цена (${indicators.currentPrice.toFixed(6)}) на/выше верхней полосы (${indicators.bb.upper.toFixed(6)}) - сильный сигнал для SHORT`);
      } else if (signalType === 'LONG' && indicators.currentPrice < indicators.bb.middle) {
        // Цена ниже средней полосы - потенциал для роста
        totalScore += weights.bb * 0.5;
        this.log(`BB: цена (${indicators.currentPrice.toFixed(6)}) ниже средней полосы (${indicators.bb.middle.toFixed(6)}) - умеренный сигнал для LONG`);
      } else if (signalType === 'SHORT' && indicators.currentPrice > indicators.bb.middle) {
        // Цена выше средней полосы - потенциал для падения
        totalScore += weights.bb * 0.5;
        this.log(`BB: цена (${indicators.currentPrice.toFixed(6)}) выше средней полосы (${indicators.bb.middle.toFixed(6)}) - умеренный сигнал для SHORT`);
      } else {
        if (signalType === 'LONG') {
          this.log(`BB не подтверждает LONG сигнал: цена (${indicators.currentPrice.toFixed(6)}) выше средней полосы (${indicators.bb.middle.toFixed(6)})`);
        } else {
          this.log(`BB не подтверждает SHORT сигнал: цена (${indicators.currentPrice.toFixed(6)}) ниже средней полосы (${indicators.bb.middle.toFixed(6)})`);
        }
      }
    }
    
    // Проверка ADX (сила тренда)
    if (indicators.adx !== undefined) {
      maxPossibleScore += weights.adx;
      
      // ADX показывает силу тренда, независимо от его направления
      if (indicators.adx >= 25) {
        // Сильный тренд
        totalScore += weights.adx;
        this.log(`ADX: ${indicators.adx.toFixed(2)} указывает на сильный тренд - положительный фактор`);
      } else if (indicators.adx >= 20) {
        // Умеренный тренд
        totalScore += weights.adx * 0.8;
        this.log(`ADX: ${indicators.adx.toFixed(2)} указывает на умеренный тренд - положительный фактор`);
      } else if (indicators.adx >= 15) {
        // Слабый тренд
        totalScore += weights.adx * 0.5;
        this.log(`ADX: ${indicators.adx.toFixed(2)} указывает на слабый тренд - умеренно положительный фактор`);
      } else {
        this.log(`ADX: ${indicators.adx.toFixed(2)} указывает на отсутствие выраженного тренда - негативный фактор`);
      }
    }
    
    // Рассчитываем процент уверенности
    const confidenceLevel = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    this.log(`Итоговый уровень уверенности для ${signalType}: ${confidenceLevel.toFixed(2)}%`);
    
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
    console.log(`Проверка сигналов: не прошло минимальное время с последнего сигнала (${Math.floor((now - this.lastSignalTime) / 1000)} сек из ${Math.floor(this.minIntervalBetweenTrades / 1000)} сек)`);
    return null;
  }
  
  console.log('------- АНАЛИЗ СИГНАЛОВ ДЛЯ ВХОДА В ПОЗИЦИЮ -------');
  console.log(`Текущая цена: ${indicators.currentPrice}`);
  
  // Базовые сигналы для входа в лонг или шорт
  let longSignal = false;
  let shortSignal = false;
  let longReasons = [];
  let shortReasons = [];
  
  // Проверка на Price Action Channel (PAC)
  if (indicators.pac && indicators.prevPrices) {
    console.log('Анализ Price Action Channel (PAC):');
    console.log(`- Верхняя граница PAC: ${indicators.pac.upper.toFixed(4)}`);
    console.log(`- Центр PAC: ${indicators.pac.center.toFixed(4)}`);
    console.log(`- Нижняя граница PAC: ${indicators.pac.lower.toFixed(4)}`);
    
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
    
    console.log(`- Цена выше центра PAC: ${currentAboveCenter ? 'ДА' : 'НЕТ'}`);
    console.log(`- Было пересечение центра PAC снизу вверх: ${prevCrossedBelowCenter ? 'ДА' : 'НЕТ'}`);
    console.log(`- Цена ниже центра PAC: ${currentBelowCenter ? 'ДА' : 'НЕТ'}`);
    console.log(`- Было пересечение центра PAC сверху вниз: ${prevCrossedAboveCenter ? 'ДА' : 'НЕТ'}`);
    
    // Сигнал на лонг: 
    // - Текущая цена выше центра PAC 
    // - В недавней истории было пересечение центра PAC снизу вверх
    // - Если есть EMA, то быстрая EMA должна быть выше медленной (подтверждение тренда)
    const emaConfirmLong = !indicators.ema || indicators.ema.fast >= indicators.ema.slow;
    console.log(`- EMA подтверждает LONG: ${emaConfirmLong ? 'ДА' : 'НЕТ'}`);
    
    if (currentAboveCenter && prevCrossedBelowCenter && emaConfirmLong) {
      longSignal = true;
      longReasons.push("Цена выше центра PAC и было пересечение снизу вверх");
      console.log('✅ LONG сигнал от PAC: условия выполнены');
    } else {
      console.log('❌ LONG сигнал от PAC: условия не выполнены');
      if (!currentAboveCenter) console.log('  - Цена не выше центра PAC');
      if (!prevCrossedBelowCenter) console.log('  - Не было пересечения снизу вверх');
      if (!emaConfirmLong) console.log('  - EMA не подтверждает тренд');
    }
    
    // Сигнал на шорт: 
    // - Текущая цена ниже центра PAC 
    // - В недавней истории было пересечение центра PAC сверху вниз
    // - Если есть EMA, то быстрая EMA должна быть ниже медленной (подтверждение тренда)
    const emaConfirmShort = !indicators.ema || indicators.ema.fast <= indicators.ema.slow;
    console.log(`- EMA подтверждает SHORT: ${emaConfirmShort ? 'ДА' : 'НЕТ'}`);
    
    if (currentBelowCenter && prevCrossedAboveCenter && emaConfirmShort) {
      shortSignal = true;
      shortReasons.push("Цена ниже центра PAC и было пересечение сверху вниз");
      console.log('✅ SHORT сигнал от PAC: условия выполнены');
    } else {
      console.log('❌ SHORT сигнал от PAC: условия не выполнены');
      if (!currentBelowCenter) console.log('  - Цена не ниже центра PAC');
      if (!prevCrossedAboveCenter) console.log('  - Не было пересечения сверху вниз');
      if (!emaConfirmShort) console.log('  - EMA не подтверждает тренд');
    }
  } else {
    console.log('PAC индикатор отсутствует, используем альтернативные индикаторы');
  }
  
  // Альтернативная проверка на базе EMA и RSI при отсутствии PAC
  if (!indicators.pac && indicators.ema && indicators.rsi) {
    console.log('Альтернативный анализ EMA+RSI:');
    
    if (indicators.ema) {
      console.log(`- Быстрая EMA: ${indicators.ema.fast.toFixed(4)}`);
      console.log(`- Медленная EMA: ${indicators.ema.slow.toFixed(4)}`);
      console.log(`- EMA тренд: ${indicators.ema.fast > indicators.ema.slow ? 'ВОСХОДЯЩИЙ' : 'НИСХОДЯЩИЙ'}`);
    }
    
    if (indicators.rsi) {
      console.log(`- RSI текущий: ${indicators.rsi.toFixed(2)}`);
      console.log(`- RSI предыдущий: ${indicators.prevRsi.toFixed(2)}`);
      console.log(`- RSI направление: ${indicators.rsi > indicators.prevRsi ? 'РАСТЕТ' : 'ПАДАЕТ'}`);
    }
    
    // Сигнал на лонг:
    // - Быстрая EMA выше медленной (восходящий тренд)
    // - RSI находится в зоне перепроданности и растет
    const emaUptrend = indicators.ema.fast > indicators.ema.slow;
    const rsiOversold = indicators.rsi < 40;
    const rsiRising = indicators.rsi > indicators.prevRsi;
    
    console.log(`- EMA в восходящем тренде: ${emaUptrend ? 'ДА' : 'НЕТ'}`);
    console.log(`- RSI в зоне перепроданности (<40): ${rsiOversold ? 'ДА' : 'НЕТ'}`);
    console.log(`- RSI растет: ${rsiRising ? 'ДА' : 'НЕТ'}`);
    
    if (emaUptrend && rsiOversold && rsiRising) {
      longSignal = true;
      longReasons.push("EMA в восходящем тренде и RSI растет из зоны перепроданности");
      console.log('✅ LONG сигнал от EMA+RSI: условия выполнены');
    } else {
      console.log('❌ LONG сигнал от EMA+RSI: условия не выполнены');
    }
    
    // Сигнал на шорт:
    // - Быстрая EMA ниже медленной (нисходящий тренд)
    // - RSI находится в зоне перекупленности и падает
    const emaDowntrend = indicators.ema.fast < indicators.ema.slow;
    const rsiOverbought = indicators.rsi > 60;
    const rsiFalling = indicators.rsi < indicators.prevRsi;
    
    console.log(`- EMA в нисходящем тренде: ${emaDowntrend ? 'ДА' : 'НЕТ'}`);
    console.log(`- RSI в зоне перекупленности (>60): ${rsiOverbought ? 'ДА' : 'НЕТ'}`);
    console.log(`- RSI падает: ${rsiFalling ? 'ДА' : 'НЕТ'}`);
    
    if (emaDowntrend && rsiOverbought && rsiFalling) {
      shortSignal = true;
      shortReasons.push("EMA в нисходящем тренде и RSI падает из зоны перекупленности");
      console.log('✅ SHORT сигнал от EMA+RSI: условия выполнены');
    } else {
      console.log('❌ SHORT сигнал от EMA+RSI: условия не выполнены');
    }
  }
  
  // Если индикаторы используются как рекомендация, а не строгое условие
  if (!this.indicatorsAsRequirement) {
    console.log('Режим индикаторов: РЕКОМЕНДАТЕЛЬНЫЙ (не строгий)');
    
    // Дополнительная проверка на Bollinger Bands для усиления сигнала
    if (indicators.bb) {
      console.log('Анализ Bollinger Bands:');
      console.log(`- Верхняя полоса: ${indicators.bb.upper.toFixed(4)}`);
      console.log(`- Средняя полоса: ${indicators.bb.middle.toFixed(4)}`);
      console.log(`- Нижняя полоса: ${indicators.bb.lower.toFixed(4)}`);
      
      // Цена на/ниже нижней полосы Боллинджера - сигнал на лонг
      const priceBelowLowerBB = indicators.currentPrice <= indicators.bb.lower * 1.01;
      console.log(`- Цена на/ниже нижней полосы BB: ${priceBelowLowerBB ? 'ДА' : 'НЕТ'}`);
      
      if (priceBelowLowerBB) {
        longSignal = true;
        longReasons.push("Цена на/ниже нижней полосы Боллинджера");
        console.log('✅ LONG сигнал от BB: цена на/ниже нижней полосы');
      }
      
      // Цена на/выше верхней полосы Боллинджера - сигнал на шорт
      const priceAboveUpperBB = indicators.currentPrice >= indicators.bb.upper * 0.99;
      console.log(`- Цена на/выше верхней полосы BB: ${priceAboveUpperBB ? 'ДА' : 'НЕТ'}`);
      
      if (priceAboveUpperBB) {
        shortSignal = true;
        shortReasons.push("Цена на/выше верхней полосы Боллинджера");
        console.log('✅ SHORT сигнал от BB: цена на/выше верхней полосы');
      }
    }
  } else {
    console.log('Режим индикаторов: СТРОГИЙ (все фильтры должны пройти)');
    
    // Проверка ADX (сила тренда)
    if (indicators.adx) {
      console.log(`Проверка ADX: значение ${indicators.adx}, минимум ${15}`);
      
      if (indicators.adx < 15) {
        // Слишком слабый тренд - отменяем сигналы
        console.log('❌ ADX фильтр: слишком слабый тренд, все сигналы отменены');
        longSignal = false;
        shortSignal = false;
      } else {
        console.log('✅ ADX фильтр: тренд достаточно силен');
      }
    }
    
    // Проверка на соответствие RSI тренду
    if (indicators.rsi) {
      // Для лонга RSI не должен быть в зоне перекупленности
      if (longSignal && indicators.rsi > 70) {
        console.log(`❌ RSI фильтр: RSI (${indicators.rsi.toFixed(2)}) в зоне перекупленности, LONG сигнал отменен`);
        longSignal = false;
      } else if (longSignal) {
        console.log(`✅ RSI фильтр для LONG: RSI (${indicators.rsi.toFixed(2)}) не в зоне перекупленности`);
      }
      
      // Для шорта RSI не должен быть в зоне перепроданности
      if (shortSignal && indicators.rsi < 30) {
        console.log(`❌ RSI фильтр: RSI (${indicators.rsi.toFixed(2)}) в зоне перепроданности, SHORT сигнал отменен`);
        shortSignal = false;
      } else if (shortSignal) {
        console.log(`✅ RSI фильтр для SHORT: RSI (${indicators.rsi.toFixed(2)}) не в зоне перепроданности`);
      }
    }
  }
  
  // Формируем сигнал, если условия выполнены
  if (longSignal || shortSignal) {
    const signalType = longSignal ? 'LONG' : 'SHORT';
    const confidenceLevel = this.calculateConfidence(indicators, signalType);
    const reasons = longSignal ? longReasons : shortReasons;
    
    // Если используем как условие, проверяем минимальный порог уверенности
    if (this.indicatorsAsRequirement && confidenceLevel < 60) {
      console.log(`❌ Недостаточный уровень уверенности для ${signalType}: ${confidenceLevel}% (минимум 60%)`);
      return null;
    }
    
    console.log(`✅ Итоговый ${signalType} сигнал сформирован с уверенностью ${confidenceLevel}%`);
    console.log(`Причины: ${reasons.join("; ")}`);
    console.log('------- КОНЕЦ АНАЛИЗА СИГНАЛОВ -------');
    
    this.lastSignalTime = now;
    this.confidence = confidenceLevel;
    
    return {
      type: signalType,
      price: indicators.currentPrice,
      timestamp: now,
      confidenceLevel: confidenceLevel,
      reason: `Скальпинг: ${signalType} сигнал, уверенность: ${confidenceLevel}%, причины: ${reasons.join("; ")}`
    };
  }
  
  console.log('❌ Итоговый результат: нет сигнала для входа в позицию');
  console.log('------- КОНЕЦ АНАЛИЗА СИГНАЛОВ -------');
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
        this.log(`Достигнуто максимальное количество открытых позиций (${this.config.riskManagement.maxOpenPositions}), пропускаем проверку сигналов`, 'warning');
        return;
      }
      
      this.log(`Выполнение стратегии. Текущая цена: ${currentPrice.toFixed(6)}, открытых позиций: ${openPositions.length}/${this.config.riskManagement.maxOpenPositions}`, 'info');
      
      // Получаем текущие значения индикаторов
      const indicators = this.indicatorManager.getCurrentIndicators();
      indicators.currentPrice = currentPrice;
      
      // Проверяем условия для входа
      const signal = this.checkEntryConditions(indicators);
      
      if (signal) {
        this.log(`Открываем ${signal.type} позицию с уверенностью ${signal.confidenceLevel}% по цене ${currentPrice.toFixed(6)}`, 'success');
        
        // Вызываем метод для создания позиции
        await this.positionManager.openPosition(
          signal.type,
          currentPrice,
          signal.reason,
          signal.confidenceLevel
        );
      }
    } catch (error) {
      this.log(`Ошибка при исполнении стратегии: ${error.message}`, 'error');
    }
  }
}

module.exports = ScalpingStrategy;
