// Модификация метода checkEntryConditions в файле strategies/scalping-strategy.js
// Добавляем подробное логирование процесса проверки сигналов

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