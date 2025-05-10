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
    
    // Для TP/SL определяем правильную сторону
    // Для закрытия LONG: 'sell', для закрытия SHORT: 'buy'
    const tpSlSide = positionType === 'LONG' ? 'sell' : 'buy';
    
    // Параметры для TP
    const tpParams = {
      symbol: this.config.symbol,
      marginCoin: 'USDT',
      triggerPrice: tpPrice.toFixed(6),
      triggerType: 'market_price',
      orderType: 'market',
      side: tpSlSide,
      size: '100%',
      clientOid: `tp_${orderId}_${new Date().getTime()}`,
      productType: "USDT-FUTURES"
    };
    
    // Параметры для SL
    const slParams = {
      symbol: this.config.symbol,
      marginCoin: 'USDT',
      triggerPrice: slPrice.toFixed(6),
      triggerType: 'market_price',
      orderType: 'market',
      side: tpSlSide,
      size: '100%',
      clientOid: `sl_${orderId}_${new Date().getTime()}`,
      productType: "USDT-FUTURES"
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