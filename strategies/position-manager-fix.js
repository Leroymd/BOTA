// Модификация метода closePosition в файле positions/position-manager.js
// Исправление закрытия позиций с учетом нового формата side для BitGet API

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
    
    // Закрытие позиции через API BitGet
    // Используем числовые значения side:
    // 3 = закрыть лонг, 4 = закрыть шорт
    const closeSide = position.type === 'LONG' ? 3 : 4;
    
    // Закрытие позиции
    const orderResult = await this.client.placeOrder(
      this.config.symbol,
      closeSide, // Используем правильный числовой код для закрытия позиции
      'MARKET',
      closeSize,
      null,
      true // reduceOnly
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