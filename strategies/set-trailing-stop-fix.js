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
    
    // Определяем сторону для закрытия позиции (sell для LONG, buy для SHORT)
    const stopSide = position.type === 'LONG' ? 'sell' : 'buy';
    
    // Создаем новый трейлинг-стоп
    const stopParams = {
      symbol: this.config.symbol,
      marginCoin: 'USDT',
      triggerPrice: trailingStopPrice.toFixed(6),
      triggerType: 'market_price',
      orderType: 'market',
      side: stopSide,
      size: '100%',
      clientOid: `ts_${position.id}_${new Date().getTime()}`,
      productType: "USDT-FUTURES"
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