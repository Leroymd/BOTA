/**
 * Размещение ордера
 * @param {string} symbol - Символ торговой пары
 * @param {string} side - Сторона (buy или sell)
 * @param {string} orderType - Тип ордера (limit или market)
 * @param {string|number} size - Размер ордера
 * @param {number|null} price - Цена для лимитного ордера
 * @param {boolean} reduceOnly - Флаг только для уменьшения позиции
 * @returns {Promise<Object>} - Результат размещения ордера
 */
async placeOrder(symbol, side, orderType, size, price = null, reduceOnly = false) {
  console.log(`Размещение ордера для ${symbol}: ${side} ${orderType} ${size}`);
  
  // Проверка наличия обязательных параметров
  if (!symbol) {
    const error = new Error('Symbol is required for placing an order');
    return Promise.reject(error);
  }

  // Проверяем, что side имеет правильное значение и приводим к нижнему регистру
  if (side.toUpperCase() !== 'BUY' && side.toUpperCase() !== 'SELL') {
    console.error(`Некорректное значение side: ${side}, должно быть buy или sell`);
    return Promise.reject(new Error(`Invalid side value: ${side}`));
  }

  try {
    // Создаем объект параметров для API
    const params = {
      symbol,
      marginCoin: 'USDT', // По умолчанию USDT
      size: size.toString(),
      side: side.toLowerCase(), // Приводим к нижнему регистру согласно документации
      orderType: orderType.toLowerCase(), // Приводим к нижнему регистру
      force: 'gtc', // Используем правильный параметр срока действия ордера
      marginMode: 'isolated', // Важно: добавляем marginMode
      clientOid: `order_${Date.now()}`,
      productType: "USDT-FUTURES"
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
    this.log(`Размещение ордера с параметрами:`, JSON.stringify(params));
    
    // Реальное размещение ордера через API
    const result = await this.submitOrder(params);
    this.log(`Результат размещения ордера:`, JSON.stringify(result));
    return result;
  } catch (error) {
    this.logError(`Ошибка при размещении ордера:`, error);
    
    // Получение дополнительной информации об ошибке
    if (error.response) {
      this.logError('Данные ответа:', error.response.data);
      this.logError('Статус ответа:', error.response.status);
    }
    
    return Promise.reject(error);
  }
}