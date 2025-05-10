// Модификация метода openPosition в файле positions/position-manager.js
// Исправление открытия позиций с учетом нового формата side для BitGet API

/**
 * Открытие новой позиции
 * @param {string} type - Тип позиции (LONG или SHORT)
 * @param {number} price - Цена входа
 * @param {string} reason - Причина открытия позиции
 * @param {number} confidenceLevel - Уровень уверенности (0-100%)
 * @returns {Promise<Object|null>} - Созданная позиция или null при ошибке
 */
async openPosition(type, price, reason, confidenceLevel = 0) {
  try {
    if (!this.client || !price) {
      console.error('Не удалось открыть позицию: отсутствует клиент API или цена.');
      return null;
    }
    
    // Проверяем, что не превышаем максимальное количество открытых позиций
    if (this.openPositions.length >= this.config.riskManagement.maxOpenPositions) {
      console.warn(`Достигнуто максимальное количество открытых позиций (${this.config.riskManagement.maxOpenPositions})`);
      return null;
    }
    
    // Расчет размера позиции
    const positionSize = this.calculatePositionSize();
    if (positionSize <= 0) {
      console.error('Не удалось рассчитать размер позиции');
      return null;
    }
    
    // Улучшенное логирование
    console.log(`-------- ОТКРЫТИЕ ПОЗИЦИИ --------`);
    console.log(`Тип: ${type}, Размер: ${positionSize} USDT, Цена: ${price}, Уверенность: ${confidenceLevel}%`);
    console.log(`Причина: ${reason}`);
    
    // Определяем side для BitGet API
    // Используем числовые коды: 1 = открыть лонг, 2 = открыть шорт
    const openSide = type === 'LONG' ? 1 : 2;
    
    console.log(`Создание ${type} позиции (side=${openSide}) размером ${positionSize} USDT по рыночной цене...`);
    
    // Размещение ордера через клиент BitGet
    try {
      const orderResult = await this.client.placeOrder(
        this.config.symbol,
        openSide,  // Используем числовой код для открытия позиции
        'MARKET',
        positionSize,
        null,  // Нет цены для рыночного ордера
        false  // Не reduceOnly
      );
      
      console.log(`Ответ API при размещении ордера:`, JSON.stringify(orderResult));
      
      if (orderResult.code === '00000' && orderResult.data && orderResult.data.orderId) {
        const orderId = orderResult.data.orderId;
        console.log(`Успешно создан ордер с ID: ${orderId}`);
        
        // Динамический тейк-профит и стоп-лосс
        let takeProfitPercentage = this.config.takeProfitPercentage;
        let stopLossPercentage = this.config.stopLossPercentage;
        
        // Расчет уровней TP и SL
        const takeProfitPrice = type === 'LONG' 
          ? price * (1 + takeProfitPercentage / 100)
          : price * (1 - takeProfitPercentage / 100);
          
        const stopLossPrice = type === 'LONG'
          ? price * (1 - stopLossPercentage / 100)
          : price * (1 + stopLossPercentage / 100);
        
        console.log(`Расчет TP/SL для ${type}:`);
        console.log(`- Цена входа: ${price}`);
        console.log(`- TP %: ${takeProfitPercentage}, TP цена: ${takeProfitPrice}`);
        console.log(`- SL %: ${stopLossPercentage}, SL цена: ${stopLossPrice}`);
        
        // Установка тейк-профита и стоп-лосса
        await this.setTakeProfitAndStopLoss(type, orderId, takeProfitPrice, stopLossPrice);
        
        // Добавление информации о позиции
        const newPosition = {
          id: orderId,
          type: type,
          entryPrice: price,
          size: positionSize,
          entryTime: new Date().getTime(),
          takeProfitPrice: takeProfitPrice,
          stopLossPrice: stopLossPrice,
          trailingStopActivated: false,
          highestPnl: 0,
          lowestPnl: 0,
          confidenceLevel: confidenceLevel,
          partiallyClosedPercentage: 0, // Процент частично закрытой позиции
          dcaOrders: []
        };
        
        this.openPositions.push(newPosition);
        
        // Запись в историю
        const historyEntry = {
          ...newPosition,
          strategy: this.config.strategy,
          reason: reason
        };
        
        this.positionHistory.push(historyEntry);
        
        // Если это DCA стратегия, подготавливаем ордера для усреднения
        if (this.config.strategy === 'DCA') {
          await this.prepareDCAOrders(newPosition);
        }
        
        console.log(`Позиция успешно создана и добавлена в список открытых позиций`);
        console.log(`-------- ПОЗИЦИЯ ОТКРЫТА --------`);
        
        this.emit('position_opened', newPosition);
        return newPosition;
      } else {
        console.error(`Ошибка создания ордера:`, orderResult);
        console.error(`Код ошибки: ${orderResult.code}, Сообщение: ${orderResult.msg || 'Неизвестная ошибка'}`);
        return null;
      }
    } catch (orderError) {
      console.error(`Ошибка в API при размещении ордера:`, orderError);
      // Полная информация об ошибке для отладки
      if (orderError.response) {
        console.error('Данные ответа:', orderError.response.data);
        console.error('Статус ответа:', orderError.response.status);
        console.error('Заголовки ответа:', orderError.response.headers);
      } else if (orderError.request) {
        console.error('Нет ответа от сервера, объект запроса:', orderError.request);
      } else {
        console.error('Сообщение об ошибке:', orderError.message);
      }
      return null;
    }
  } catch (error) {
    console.error('Ошибка при открытии позиции:', error);
    return null;
  }
}