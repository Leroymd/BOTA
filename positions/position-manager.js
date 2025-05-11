// positions/position-manager.js - Управление торговыми позициями

const EventEmitter = require('events');

/**
 * Класс для управления позициями
 */
class PositionManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.balance = 0;
    this.openPositions = [];
    this.positionHistory = [];
  }

  /**
   * Установка клиента API
   * @param {Object} client - Экземпляр клиента API
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Установка баланса аккаунта
   * @param {number} balance - Текущий баланс
   */
  setBalance(balance) {
    this.balance = balance;
  }

  /**
   * Обновление конфигурации
   * @param {Object} newConfig - Новая конфигурация
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

/**
 * Обновление параметров позиции
 * @param {string} positionId - ID позиции
 * @param {Object} params - Параметры для обновления
 * @param {number} params.takeProfit - Новый уровень тейк-профита в процентах
 * @param {number} params.stopLoss - Новый уровень стоп-лосса в процентах
 * @param {Object} params.trailingStop - Параметры трейлинг-стопа
 * @returns {Promise<boolean>} - Результат обновления
 */
async updatePositionParams(positionId, params) {
  try {
    const position = this.openPositions.find(p => p.id === positionId);
    
    if (!position) {
      console.warn(`Позиция с ID ${positionId} не найдена`);
      return false;
    }
    
    // Получаем текущую цену
    const ticker = await this.client.getTicker(this.config.symbol);
    const currentPrice = ticker.data && ticker.data.last ? parseFloat(ticker.data.last) : null;
    
    if (!currentPrice) {
      console.error('Не удалось получить текущую цену для обновления параметров позиции');
      return false;
    }
    
    // Обновляем тейк-профит при необходимости
    if (params.takeProfit !== undefined) {
      const takeProfitPrice = position.type === 'LONG' 
        ? currentPrice * (1 + params.takeProfit / 100)
        : currentPrice * (1 - params.takeProfit / 100);
      
      position.takeProfitPrice = takeProfitPrice;
      
      // Отменяем существующие тейк-профит ордера
      const openOrders = await this.client.getOpenOrders(this.config.symbol, 'USDT');
      
      if (openOrders.data && openOrders.data.length > 0) {
        for (const order of openOrders.data) {
          if (order.clientOid && order.clientOid.includes(`tp_${position.id}`)) {
            await this.client.cancelOrder(this.config.symbol, 'USDT', order.orderId);
          }
        }
      }
      
      // Создаем новый тейк-профит ордер
      const tpSide = position.type === 'LONG' ? 'sell' : 'buy';
      
      const tpParams = {
        symbol: this.config.symbol,
        marginCoin: 'USDT',
        triggerPrice: takeProfitPrice.toFixed(6),
        triggerType: 'market_price',
        orderType: 'market',
        side: tpSide,
        tradeSide: 'close', // Добавляем параметр tradeSide: 'close'
        size: '100%',
        clientOid: `tp_${position.id}_${new Date().getTime()}`
      };
      
      await this.client.submitPlanOrder(tpParams);
      console.log(`Обновлен тейк-профит для позиции ${positionId} до ${takeProfitPrice.toFixed(6)}`);
    }
    
    // Обновляем стоп-лосс при необходимости
    if (params.stopLoss !== undefined) {
      const stopLossPrice = position.type === 'LONG'
        ? currentPrice * (1 - params.stopLoss / 100)
        : currentPrice * (1 + params.stopLoss / 100);
      
      position.stopLossPrice = stopLossPrice;
      
      // Отменяем существующие стоп-лосс ордера
      const openOrders = await this.client.getOpenOrders(this.config.symbol, 'USDT');
      
      if (openOrders.data && openOrders.data.length > 0) {
        for (const order of openOrders.data) {
          if (order.clientOid && order.clientOid.includes(`sl_${position.id}`)) {
            await this.client.cancelOrder(this.config.symbol, 'USDT', order.orderId);
          }
        }
      }
      
      // Создаем новый стоп-лосс ордер
      const slSide = position.type === 'LONG' ? 'sell' : 'buy';
      
      const slParams = {
        symbol: this.config.symbol,
        marginCoin: 'USDT',
        triggerPrice: stopLossPrice.toFixed(6),
        triggerType: 'market_price',
        orderType: 'market',
        side: slSide,
        tradeSide: 'close', // Добавляем параметр tradeSide: 'close'
        size: '100%',
        clientOid: `sl_${position.id}_${new Date().getTime()}`
      };
      
      await this.client.submitPlanOrder(slParams);
      console.log(`Обновлен стоп-лосс для позиции ${positionId} до ${stopLossPrice.toFixed(6)}`);
    }
    
    // Обновляем настройки трейлинг-стопа при необходимости
    if (params.trailingStop) {
      if (params.trailingStop.enabled !== undefined) {
        position.trailingStopEnabled = params.trailingStop.enabled;
      }
      
      if (params.trailingStop.activationPercentage !== undefined) {
        position.trailingStopActivationPercentage = params.trailingStop.activationPercentage;
      }
      
      if (params.trailingStop.stopDistance !== undefined) {
        position.trailingStopDistance = params.trailingStop.stopDistance;
      }
      
      // Если трейлинг-стоп активирован и P&L достаточен, устанавливаем трейлинг-стоп
      if (position.trailingStopEnabled && !position.trailingStopActivated) {
        const pnlPercentage = position.type === 'LONG'
          ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * this.config.leverage
          : ((position.entryPrice - currentPrice) / position.entryPrice) * 100 * this.config.leverage;
        
        const activationThreshold = position.trailingStopActivationPercentage || 
                                   this.config.trailingStop.activationPercentage;
        
        if (pnlPercentage >= activationThreshold) {
          position.trailingStopActivated = true;
          await this.setTrailingStop(position, currentPrice);
          console.log(`Трейлинг-стоп активирован для позиции ${position.id}`);
        }
      }
    }
    
    // Обновляем позицию в списке
    const index = this.openPositions.findIndex(p => p.id === positionId);
    if (index !== -1) {
      this.openPositions[index] = position;
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении параметров позиции:', error);
    return false;
  }
}

/**
 * Проверка и выполнение частичного закрытия позиции при достижении целей P&L
 * @param {Object} position - Позиция для проверки
 * @param {number} currentPrice - Текущая цена
 * @returns {Promise<boolean>} - Результат выполнения частичного закрытия
 */
async checkPartialCloseTargets(position, currentPrice) {
  try {
    if (!this.config.partialClose || !this.config.partialClose.enabled) {
      return false;
    }
    
    // Расчет текущего P&L
    const pnlPercentage = position.type === 'LONG'
      ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * this.config.leverage
      : ((position.entryPrice - currentPrice) / position.entryPrice) * 100 * this.config.leverage;
    
    position.currentPnl = pnlPercentage;
    
    // Проверка первого уровня частичного закрытия
    if (!position.partialCloseLevel1Executed && 
        this.config.partialClose.level1 && 
        pnlPercentage >= this.config.partialClose.level1) {
      
      const closePercentage = this.config.partialClose.amount1 || 30;
      
      console.log(`Достигнут первый уровень частичного закрытия для позиции ${position.id}. Закрываем ${closePercentage}%`);
      
      const result = await this.closePosition(position.id, closePercentage);
      
      if (result) {
        position.partialCloseLevel1Executed = true;
        console.log(`Успешно выполнено частичное закрытие уровня 1 для позиции ${position.id}`);
        return true;
      }
    }
    
    // Проверка второго уровня частичного закрытия
    if (!position.partialCloseLevel2Executed && 
        position.partialCloseLevel1Executed && 
        this.config.partialClose.level2 && 
        pnlPercentage >= this.config.partialClose.level2) {
      
      const closePercentage = this.config.partialClose.amount2 || 50;
      
      console.log(`Достигнут второй уровень частичного закрытия для позиции ${position.id}. Закрываем ${closePercentage}%`);
      
      const result = await this.closePosition(position.id, closePercentage);
      
      if (result) {
        position.partialCloseLevel2Executed = true;
        console.log(`Успешно выполнено частичное закрытие уровня 2 для позиции ${position.id}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при проверке целей частичного закрытия:', error);
    return false;
  }
}

/**
 * Обновление открытых позиций с проверкой частичного закрытия
 * Модифицированная версия исходного метода updateOpenPositions
 * @param {number} currentPrice - Текущая цена
 * @returns {Promise<Object[]>} - Список открытых позиций
 */
async updateOpenPositions(currentPrice) {
  try {
    // Получение текущих позиций с BitGet
    const positions = await this.client.getPositions(this.config.symbol);
    
    if (positions.data && positions.data.length > 0) {
      // Обновляем информацию о позициях
      for (const apiPosition of positions.data) {
        const positionId = apiPosition.posId;
        const positionType = apiPosition.holdSide === 'long' ? 'LONG' : 'SHORT';
        const entryPrice = parseFloat(apiPosition.averageOpenPrice);
        const size = parseFloat(apiPosition.margin);
        
        // Проверяем, есть ли эта позиция в нашем списке
        const existingPosition = this.openPositions.find(p => p.id === positionId);
        
        if (existingPosition) {
          // Обновляем информацию
          existingPosition.entryPrice = entryPrice;
          existingPosition.size = size;
          
          // Рассчитываем текущий P&L
          const pnlPercentage = positionType === 'LONG'
            ? ((currentPrice - entryPrice) / entryPrice) * 100 * this.config.leverage
            : ((entryPrice - currentPrice) / entryPrice) * 100 * this.config.leverage;
          
          existingPosition.currentPnl = pnlPercentage;
          
          // Обновляем макс. P&L для трейлинг-стопа
          if (pnlPercentage > existingPosition.highestPnl) {
            existingPosition.highestPnl = pnlPercentage;
          }
          
          if (pnlPercentage < existingPosition.lowestPnl) {
            existingPosition.lowestPnl = pnlPercentage;
          }
          
          // Проверяем необходимость частичного закрытия
          await this.checkPartialCloseTargets(existingPosition, currentPrice);
        } else {
          // Добавляем новую позицию, если ее нет в нашем списке
          const newPosition = {
            id: positionId,
            type: positionType,
            entryPrice: entryPrice,
            size: size,
            entryTime: new Date().getTime(), // Приблизительное время
            takeProfitPrice: 0, // Будет обновлено позже
            stopLossPrice: 0, // Будет обновлено позже
            trailingStopActivated: false,
            highestPnl: 0,
            lowestPnl: 0,
            currentPnl: 0,
            confidenceLevel: 0,
            partiallyClosedPercentage: 0,
            partialCloseLevel1Executed: false,
            partialCloseLevel2Executed: false,
            dcaOrders: []
          };
          
          this.openPositions.push(newPosition);
        }
      }
      
      // Удаляем позиции, которых больше нет в API
      const closedPositions = [];
      const stillOpenPositions = [];
      
      for (const position of this.openPositions) {
        const stillExists = positions.data.some(apiPos => apiPos.posId === position.id);
        
        if (stillExists) {
          stillOpenPositions.push(position);
        } else {
          closedPositions.push(position);
        }
      }
      
      // Обновляем статистику для закрытых позиций
      for (const position of closedPositions) {
        this.updatePositionHistory(position, 'closed', currentPrice);
      }
      
      // Обновляем список открытых позиций
      this.openPositions = stillOpenPositions;
    } else {
      // Если нет открытых позиций, проверяем были ли закрыты наши позиции
      for (const position of this.openPositions) {
        this.updatePositionHistory(position, 'closed', currentPrice);
      }
      
      // Очищаем список
      this.openPositions = [];
    }
    
    return this.openPositions;
  } catch (error) {
    console.error('Ошибка при обновлении открытых позиций:', error);
    return this.openPositions;
  }
}
  /**
 * Расчет размера позиции с учетом реинвестирования
 * @returns {number} - Размер позиции в USDT
 */
calculatePositionSize() {
  try {
    // Базовый размер позиции как процент от текущего баланса
    let sizePercentage = this.config.positionSize || 30;
    
    // Учитываем реальный баланс
    let effectiveBalance = this.balance;
    
    // Рассчитываем размер позиции как процент от баланса
    // Важно: НЕ умножаем на плечо здесь, т.к. это влияет только на расчет внутри биржи
    const positionSize = (effectiveBalance * (sizePercentage / 100));
    
    // Округляем до 4 знаков после запятой
    return Math.floor(positionSize * 10000) / 10000;
  } catch (error) {
    console.error('Ошибка при расчете размера позиции:', error);
    return 0;
  }
}

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
    
    // Определяем side для BitGet API (строковое значение в нижнем регистре)
    const side = type === 'LONG' ? 'buy' : 'sell';
    
    console.log(`Создание ${type} позиции (side=${side}) размером ${positionSize} USDT по рыночной цене...`);
    
    // Размещение ордера через клиент BitGet
    try {
      const orderResult = await this.client.placeOrder(
        this.config.symbol,
        side,
        'market',  // Тип ордера
        positionSize,
        null,  // Нет цены для рыночного ордера
        'open'  // Указываем явно, что открываем позицию
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

  /**
   * Закрытие позиции полное или частичное
   * @param {string} positionId - ID позиции
   * @param {number} percentage - Процент закрытия (1-100%)
   * @returns {Promise<boolean>} - Результат закрытия
   */
  async closePosition(positionId, percentage = 100) {
    try {
      const position = this.openPositions.find(p => p.id === positionId);
      
      if (!position) {
        console.warn(`Позиция с ID ${positionId} не найдена`);
        return false;
      }
      
      // Проверяем корректность процента закрытия
      if (percentage <= 0 || percentage > 100) {
        console.error(`Некорректный процент закрытия: ${percentage}%`);
        return false;
      }
      
      // Если позиция уже частично закрыта, учитываем это
      const remainingPercentage = 100 - position.partiallyClosedPercentage;
      const actualClosePercentage = Math.min(percentage, remainingPercentage);
      
      // Размер для закрытия (в процентах от оставшейся части)
      const closeSize = actualClosePercentage < 100 ? 
        `${actualClosePercentage}%` : // Частичное закрытие
        '100%';                       // Полное закрытие
      
      console.log(`Закрытие ${actualClosePercentage}% позиции ${positionId} типа ${position.type}...`);
      
      // Закрытие позиции — используем противоположное направление от типа позиции
      // Для LONG позиции нужно использовать 'sell', для SHORT позиции - 'buy'
      const side = position.type === 'LONG' ? 'sell' : 'buy';
      
      // Закрытие позиции
      const orderResult = await this.client.placeOrder(
        this.config.symbol,
        side,
        'market', // Используем market для закрытия
        closeSize,
        null,
        'close' // Указываем явно, что закрываем позицию
      );
      
      if (orderResult.code === '00000') {
        console.log(`Успешно закрыто ${actualClosePercentage}% позиции ${positionId}`);
        
        // Обновляем информацию о частично закрытой позиции
        if (actualClosePercentage < 100) {
          position.partiallyClosedPercentage += actualClosePercentage;
          
          // Если полностью закрыли позицию
          if (position.partiallyClosedPercentage >= 100) {
            // Обновляем историю позиции
            this.updatePositionHistory(position, 'closed');
            
            // Удаляем позицию из списка открытых
            this.openPositions = this.openPositions.filter(p => p.id !== positionId);
          }
        } else {
          // Обновляем историю позиции
          this.updatePositionHistory(position, 'closed');
          
          // Удаляем позицию из списка открытых
          this.openPositions = this.openPositions.filter(p => p.id !== positionId);
        }
        
        this.emit('position_closed', { 
          positionId, 
          percentage: actualClosePercentage, 
          remaining: 100 - (position.partiallyClosedPercentage || 0)
        });
        
        return true;
      } else {
        console.error(`Ошибка при закрытии позиции: ${orderResult.msg || 'Неизвестная ошибка'}`);
        return false;
      }
    } catch (error) {
      console.error('Ошибка при закрытии позиции:', error);
      return false;
    }
  }

/**
 * Установка тейк-профита и стоп-лосса
 * @param {string} positionType - Тип позиции (LONG или SHORT)
 * @param {string} orderId - ID ордера
 * @param {number} tpPrice - Цена тейк-профита
 * @param {number} slPrice - Цена стоп-лосса
 * @returns {Promise<boolean>} - Результат установки
 */
async setTakeProfitAndStopLoss(positionType, orderId, tpPrice, slPrice) {
  try {
    console.log(`Установка TP/SL для позиции ${orderId} (${positionType})`);
    console.log(`TP цена: ${tpPrice.toFixed(6)}, SL цена: ${slPrice.toFixed(6)}`);
    
    // Для TP/SL используем противоположное направление от типа позиции
    // Для LONG позиции нужно использовать 'sell', для SHORT позиции - 'buy'
    const tpSlSide = positionType === 'LONG' ? 'sell' : 'buy';
    
    // Параметры для TP
    const tpParams = {
      symbol: this.config.symbol,
      marginCoin: 'USDT',
      triggerPrice: tpPrice.toFixed(6),
      triggerType: 'market_price',
      orderType: 'market',
      side: tpSlSide,
      tradeSide: 'close', // Добавляем параметр tradeSide для торговой стороны
      size: '100%',
      clientOid: `tp_${orderId}_${new Date().getTime()}`
    };
    
    // Параметры для SL
    const slParams = {
      symbol: this.config.symbol,
      marginCoin: 'USDT',
      triggerPrice: slPrice.toFixed(6),
      triggerType: 'market_price',
      orderType: 'market',
      side: tpSlSide,
      tradeSide: 'close', // Добавляем параметр tradeSide для торговой стороны
      size: '100%',
      clientOid: `sl_${orderId}_${new Date().getTime()}`
    };
    
    console.log('Параметры TP-ордера:', JSON.stringify(tpParams));
    console.log('Параметры SL-ордера:', JSON.stringify(slParams));
    
    // Создание TP
    const tpResult = await this.client.submitPlanOrder(tpParams);
    console.log('Ответ API на создание TP:', JSON.stringify(tpResult));
    
    // Создание SL
    const slResult = await this.client.submitPlanOrder(slParams);
    console.log('Ответ API на создание SL:', JSON.stringify(slResult));
    
    if (tpResult.code === '00000' && slResult.code === '00000') {
      console.log(`Успешно установлены TP (${tpPrice.toFixed(6)}) и SL (${slPrice.toFixed(6)}) для ордера ${orderId}`);
      return true;
    } else {
      console.error('Ошибка при установке TP/SL:');
      console.error('TP результат:', tpResult);
      console.error('SL результат:', slResult);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при установке TP/SL:', error);
    return false;
  }
}

  /**
   * Обновление трейлинг-стопов
   * @param {number} currentPrice - Текущая цена
   * @returns {Promise<void>}
   */
  async updateTrailingStops(currentPrice) {
    try {
      if (!this.config.trailingStop.enabled || this.openPositions.length === 0) return;
      
      for (const position of this.openPositions) {
        // Рассчитываем текущий P&L
        const pnlPercentage = position.type === 'LONG'
          ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * this.config.leverage
          : ((position.entryPrice - currentPrice) / position.entryPrice) * 100 * this.config.leverage;
        
        position.currentPnl = pnlPercentage;
        
        // Проверка условий для активации трейлинг-стопа
        const activationThreshold = this.config.takeProfitPercentage * (this.config.trailingStop.activationPercentage / 0.3);
        
        if (!position.trailingStopActivated && pnlPercentage >= activationThreshold) {
          // Активируем трейлинг-стоп
          position.trailingStopActivated = true;
          console.log(`Активирован трейлинг-стоп для позиции ${position.id} при P&L ${pnlPercentage.toFixed(2)}%`);
          
          // Устанавливаем начальный трейлинг-стоп
          await this.setTrailingStop(position, currentPrice);
        } 
        // Обновляем трейлинг-стоп, если он активирован и цена двигается в прибыльном направлении
        else if (position.trailingStopActivated) {
          // Проверка, нужно ли обновить трейлинг-стоп
          if (pnlPercentage > position.highestPnl) {
            position.highestPnl = pnlPercentage;
            await this.setTrailingStop(position, currentPrice);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении трейлинг-стопов:', error);
    }
  }

  /**
   * Установка трейлинг-стопа
   * @param {Object} position - Позиция
   * @param {number} currentPrice - Текущая цена
   * @returns {Promise<boolean>} - Результат установки
   */
  async setTrailingStop(position, currentPrice) {
    try {
      // Рассчитываем цену для трейлинг-стопа
      const trailingStopPrice = position.type === 'LONG'
        ? currentPrice * (1 - this.config.trailingStop.stopDistance / 100)
        : currentPrice * (1 + this.config.trailingStop.stopDistance / 100);
      
      // Отменяем существующие стоп-ордера
      const openOrders = await this.client.getOpenOrders(this.config.symbol, 'USDT');
      
      if (openOrders.data && openOrders.data.length > 0) {
        for (const order of openOrders.data) {
          // Проверяем, что это стоп-ордер для нашей позиции
          if (order.clientOid && (order.clientOid.includes(`sl_${position.id}`) || order.clientOid.includes(`tp_${position.id}`))) {
            await this.client.cancelOrder(this.config.symbol, 'USDT', order.orderId);
          }
        }
      }
      
      // Создаем новый трейлинг-стоп (используем тот же side, что и для закрытия)
      const stopSide = position.type === 'LONG' ? 'sell' : 'buy';
      
      const stopParams = {
        symbol: this.config.symbol,
        marginCoin: 'USDT',
        triggerPrice: trailingStopPrice.toFixed(6),
        triggerType: 'market_price',
        orderType: 'market',
        side: stopSide,
        tradeSide: 'close', // Добавляем параметр tradeSide: 'close'
        size: '100%',
        clientOid: `ts_${position.id}_${new Date().getTime()}`
      };
      
      const stopResult = await this.client.submitPlanOrder(stopParams);
      
      if (stopResult.code === '00000') {
        console.log(`Обновлен трейлинг-стоп для ${position.type} позиции до ${trailingStopPrice.toFixed(6)}`);
        return true;
      } else {
        console.error(`Ошибка при установке трейлинг-стопа: ${stopResult.msg}`);
        return false;
      }
    } catch (error) {
      console.error('Ошибка при установке трейлинг-стопа:', error);
      return false;
    }
  }

  /**
   * Проверка максимальной длительности открытых позиций
   * @returns {Promise<void>}
   */
  async checkPositionDuration() {
    try {
      const currentTime = new Date().getTime();
      // Максимальное время в миллисекундах
      const maxDuration = this.config.maxTradeDurationMinutes * 60 * 1000;
      
      for (const position of this.openPositions) {
        const duration = currentTime - position.entryTime;
        
        // Если трейлинг-стоп активирован и P&L растет, не закрываем позицию по времени
        if (position.trailingStopActivated && position.currentPnl > 0 && 
            position.currentPnl >= position.highestPnl * 0.9) {
          console.log(`Позиция ${position.id} активировала трейлинг-стоп и PnL растет - продолжаем следить`);
          continue;
        }
        
        // Если позиция открыта дольше максимального времени, закрываем ее
        if (duration >= maxDuration) {
          console.log(`Позиция ${position.id} достигла максимальной длительности (${this.config.maxTradeDurationMinutes} мин). Закрытие...`);
          
          // Закрытие позиции
          await this.closePosition(position.id);
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке длительности позиций:', error);
    }
  }

  /**
   * Подготовка ордеров для стратегии DCA
   * @param {Object} position - Позиция
   * @returns {Promise<void>}
   */
  async prepareDCAOrders(position) {
    try {
      if (this.config.strategy !== 'DCA' || !position) return;
      
      const maxOrders = this.config.dca.maxOrders;
      const priceStep = this.config.dca.priceStep;
      const multiplier = this.config.dca.multiplier;
      
      for (let i = 1; i <= maxOrders; i++) {
        // Рассчитываем цену для DCA ордера
        const dcaPrice = position.type === 'LONG'
          ? position.entryPrice * (1 - (priceStep / 100) * i)
          : position.entryPrice * (1 + (priceStep / 100) * i);
        
        // Рассчитываем размер для DCA ордера (увеличиваем с каждым ордером)
        const dcaSize = position.size * Math.pow(multiplier, i);
        
        console.log(`Создание DCA ордера #${i} для позиции ${position.id} по цене ${dcaPrice.toFixed(6)}`);
        
        // Размещение лимитного DCA ордера с правильными параметрами
        const side = position.type === 'LONG' ? 'buy' : 'sell';
        
        const orderResult = await this.client.placeOrder(
          this.config.symbol,
          side,
          'limit',
          dcaSize,
          dcaPrice.toFixed(6),
          'open' // DCA ордера всегда открывают дополнительные позиции
        );
        
        if (orderResult.code === '00000') {
          console.log(`Создан DCA ордер #${i} для позиции ${position.id} по цене ${dcaPrice.toFixed(6)}`);
          
          // Добавляем информацию о DCA ордере
          position.dcaOrders.push({
            id: orderResult.data.orderId,
            price: dcaPrice,
            size: dcaSize,
            created: new Date().getTime(),
            executed: false
          });
        } else {
          console.error(`Ошибка создания DCA ордера #${i}:`, orderResult.msg);
        }
      }
    } catch (error) {
      console.error('Ошибка при подготовке DCA ордеров:', error);
    }
  }

  /**
   * Получение списка открытых позиций
   * @returns {Object[]} - Список открытых позиций
   */
  getOpenPositions() {
    return this.openPositions;
  }

  /**
   * Получение истории позиций
   * @returns {Object[]} - История позиций
   */
  getPositionHistory() {
    return this.positionHistory;
  }

  /**
   * Обновление истории позиций
   * @param {Object} position - Позиция
   * @param {string} status - Статус (open, closed)
   * @param {number} closePrice - Цена закрытия
   */
  updatePositionHistory(position, status, closePrice = null) {
    try {
      // Находим позицию в истории
      const historyIndex = this.positionHistory.findIndex(p => p.id === position.id);
      
      if (historyIndex !== -1) {
        const updatedPosition = { ...this.positionHistory[historyIndex] };
        
        if (status === 'closed') {
          // Устанавливаем цену закрытия
          updatedPosition.closePrice = closePrice || updatedPosition.entryPrice;
          updatedPosition.closeTime = new Date().getTime();
          
          // Рассчитываем P&L
          const pnlPercentage = updatedPosition.type === 'LONG'
            ? ((updatedPosition.closePrice - updatedPosition.entryPrice) / updatedPosition.entryPrice) * 100 * this.config.leverage
            : ((updatedPosition.entryPrice - updatedPosition.closePrice) / updatedPosition.entryPrice) * 100 * this.config.leverage;
          
          updatedPosition.pnl = pnlPercentage;
          updatedPosition.result = pnlPercentage >= 0 ? 'win' : 'loss';
          
          // Добавляем информацию о частичном закрытии
          if (position.partiallyClosedPercentage > 0 && position.partiallyClosedPercentage < 100) {
            updatedPosition.partiallyClosedPercentage = position.partiallyClosedPercentage;
          }
          
          console.log(`Позиция ${position.id} закрыта с P&L: ${pnlPercentage.toFixed(2)}% (${updatedPosition.result.toUpperCase()})`);
        }
        
        // Обновляем позицию в истории
        this.positionHistory[historyIndex] = updatedPosition;
        
        // Отправляем событие обновления
        this.emit('position_history_updated', updatedPosition);
      }
    } catch (error) {
      console.error('Ошибка при обновлении истории позиций:', error);
    }
  }
}

module.exports = PositionManager;