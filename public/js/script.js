// public/js/script.js - Клиентский JavaScript для веб-интерфейса

// Инициализация Socket.IO
const socket = io();

// Элементы интерфейса для одиночного бота
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const balanceText = document.getElementById('balanceText');
const currentPriceText = document.getElementById('currentPriceText');
const dailyProfitText = document.getElementById('dailyProfitText');
const totalProfitText = document.getElementById('totalProfitText');
const winRateStatsText = document.getElementById('winRateStatsText');
const totalTradesText = document.getElementById('totalTradesText');
const winLossText = document.getElementById('winLossText');
const profitFactorText = document.getElementById('profitFactorText');
const uptimeText = document.getElementById('uptimeText');
const reinvestmentStatusText = document.getElementById('reinvestmentStatusText');
const withdrawnProfitText = document.getElementById('withdrawnProfitText');
const rsiText = document.getElementById('rsiText');
const emaText = document.getElementById('emaText');
const emaUpIcon = document.getElementById('emaUpIcon');
const emaDownIcon = document.getElementById('emaDownIcon');
const openPositionsTable = document.getElementById('openPositionsTable');
const lastTradesTable = document.getElementById('lastTradesTable');

// Элементы формы
const strategySelect = document.getElementById('strategySelect');
const symbolSelect = document.getElementById('symbolSelect');
const leverageInput = document.getElementById('leverageInput');
const positionSizeInput = document.getElementById('positionSizeInput');
const reinvestmentInput = document.getElementById('reinvestmentInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiSecretInput = document.getElementById('apiSecretInput');
const apiPassphraseInput = document.getElementById('apiPassphraseInput');
const tpInput = document.getElementById('tpInput');
const slInput = document.getElementById('slInput');
const maxDurationInput = document.getElementById('maxDurationInput');
const trailingStopCheck = document.getElementById('trailingStopCheck');
const tsActivationInput = document.getElementById('tsActivationInput');
const tsDistanceInput = document.getElementById('tsDistanceInput');
const dailyLossLimitInput = document.getElementById('dailyLossLimitInput');
const maxPositionsInput = document.getElementById('maxPositionsInput');
const dcaMaxOrdersInput = document.getElementById('dcaMaxOrdersInput');
const dcaPriceStepInput = document.getElementById('dcaPriceStepInput');
const dcaMultiplierInput = document.getElementById('dcaMultiplierInput');

// Кнопки сохранения настроек
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveApiBtn = document.getElementById('saveApiBtn');
const saveAdvancedSettingsBtn = document.getElementById('saveAdvancedSettingsBtn');

// Модальное окно для уведомлений
const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
const notificationTitle = document.getElementById('notificationTitle');
const notificationBody = document.getElementById('notificationBody');

// Элементы интерфейса менеджера ботов
const managerStatusIndicator = document.getElementById('managerStatusIndicator');
const managerStatusText = document.getElementById('managerStatusText');
const initManagerBtn = document.getElementById('initManagerBtn');
const startManagerBtn = document.getElementById('startManagerBtn');
const stopManagerBtn = document.getElementById('stopManagerBtn');
const scanPairsBtn = document.getElementById('scanPairsBtn');
const botCountInput = document.getElementById('botCountInput');
const activeBotCount = document.getElementById('activeBotCount');
const filteredPairsCount = document.getElementById('filteredPairsCount');
const botsTableBody = document.getElementById('botsTableBody');
const pairsTableBody = document.getElementById('pairsTableBody');
const managerLogsContent = document.getElementById('managerLogsContent');
const scannerLogsContent = document.getElementById('scannerLogsContent');
const refreshManagerLogsBtn = document.getElementById('refreshManagerLogsBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingMessage = document.getElementById('loadingMessage');

// Переменные состояния менеджера ботов
let managerInitialized = false;
let managerRunning = false;
let managerBots = {};
let managerPairs = [];

// График баланса
let balanceChart;
let balanceData = [];
let timeData = [];

// Получение конфигурации бота при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Инициализация графика
    initBalanceChart();
    
    // Получение настроек бота
    await fetchBotConfig();
    
    // Получение статуса бота
    await fetchBotStatus();
    
    // Привязка обработчиков событий
    attachEventListeners();
    
    // Инициализация менеджера ботов
    initManagerControls();
    
    // Запрос статуса менеджера
    fetchManagerStatus();
    
    // Инициализация логов и индикаторов
    initLoggingAndIndicators();
  } catch (error) {
    console.error('Ошибка при инициализации приложения:', error);
    showNotification('Ошибка', 'Не удалось инициализировать приложение. Проверьте консоль для деталей.');
  }
});

// Инициализация графика баланса
function initBalanceChart() {
  try {
    const options = {
      series: [{
        name: 'Баланс',
        data: balanceData
      }],
      chart: {
        height: 300,
        type: 'area',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100]
        }
      },
      xaxis: {
        type: 'datetime',
        categories: timeData
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return val.toFixed(2) + ' USDT';
          }
        }
      },
      tooltip: {
        x: {
          format: 'HH:mm:ss'
        }
      },
      colors: ['#0d6efd']
    };

    balanceChart = new ApexCharts(document.getElementById('balanceChart'), options);
    balanceChart.render();
  } catch (error) {
    console.error('Ошибка при инициализации графика:', error);
  }
}

// Обновление графика баланса
function updateBalanceChart(balance) {
  try {
    // Добавляем новую точку
    const now = new Date().getTime();
    balanceData.push(balance);
    timeData.push(now);
    
    // Оставляем только последние 50 точек для производительности
    if (balanceData.length > 50) {
      balanceData.shift();
      timeData.shift();
    }
    
    // Обновляем график
    balanceChart.updateSeries([{
      name: 'Баланс',
      data: balanceData
    }]);
    
    balanceChart.updateOptions({
      xaxis: {
        categories: timeData
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении графика баланса:', error);
  }
}

// Получение конфигурации бота
async function fetchBotConfig() {
  try {
    const response = await fetch('/api/bot/config');
    const config = await response.json();
    
    // Заполняем форму настройками
    strategySelect.value = config.strategy || 'SCALPING';
    symbolSelect.value = config.symbol || 'SOLUSDT';
    leverageInput.value = config.leverage || 10;
    positionSizeInput.value = config.positionSize || 30;
    reinvestmentInput.value = config.reinvestment !== undefined ? config.reinvestment : 90;
    
    // API ключи (показываем только маски, если они есть)
    if (config.apiKey) {
      apiKeyInput.value = '';
      apiKeyInput.dataset.masked = 'false';
    }
    
    if (config.apiSecret) {
      apiSecretInput.value = '';
      apiSecretInput.dataset.masked = 'false';
    }
    
    if (config.passphrase) {
      apiPassphraseInput.value = '';
      apiPassphraseInput.dataset.masked = 'false';
    }
    
    // Расширенные настройки
    tpInput.value = config.takeProfitPercentage || 0.3;
    slInput.value = config.stopLossPercentage || 0.2;
    maxDurationInput.value = config.maxTradeDurationMinutes || 5;
    
    if (config.trailingStop) {
      trailingStopCheck.checked = config.trailingStop.enabled;
      tsActivationInput.value = config.trailingStop.activationPercentage || 0.15;
      tsDistanceInput.value = config.trailingStop.stopDistance || 0.1;
    }
    
    if (config.riskManagement) {
      dailyLossLimitInput.value = config.riskManagement.dailyLossLimit || 10;
      maxPositionsInput.value = config.riskManagement.maxOpenPositions || 1;
    }
    
    if (config.dca) {
      dcaMaxOrdersInput.value = config.dca.maxOrders || 3;
      dcaPriceStepInput.value = config.dca.priceStep || 1.5;
      dcaMultiplierInput.value = config.dca.multiplier || 1.5;
    }
    
    return config;
  } catch (error) {
    console.error('Ошибка при получении конфигурации:', error);
    showNotification('Ошибка', 'Не удалось загрузить конфигурацию бота');
    throw error;
  }
}

// Получение статуса бота
async function fetchBotStatus() {
  try {
    const response = await fetch('/api/bot/status');
    const statusData = await response.json();
    
    updateBotStatus(statusData);
    return statusData;
  } catch (error) {
    console.error('Ошибка при получении статуса:', error);
    showNotification('Ошибка', 'Не удалось получить статус бота');
    throw error;
  }
}

// Обновление статуса бота в интерфейсе
function updateBotStatus(status) {
  try {
    // Обновляем индикатор статуса
    if (status.status === 'running') {
      statusIndicator.classList.add('active');
      statusText.textContent = 'Статус: Запущен';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      statusIndicator.classList.remove('active');
      statusText.textContent = 'Статус: Остановлен';
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
    
    // Обновляем информацию о балансе
    if (status.balance !== undefined) {
      balanceText.textContent = `${status.balance.toFixed(2)} USDT`;
    }
    
    // Обновляем график баланса, если бот запущен
    if (status.status === 'running' && status.balance !== undefined) {
      updateBalanceChart(status.balance);
    }
    
    // Обновляем текущую цену
    if (status.currentPrice > 0) {
      currentPriceText.textContent = `${status.currentPrice.toFixed(4)} USDT`;
    }
    
    // Обновляем P&L
    if (status.pnl && status.pnl.daily !== undefined) {
      if (status.pnl.daily > 0) {
        dailyProfitText.textContent = `+${status.pnl.daily.toFixed(2)}%`;
        dailyProfitText.parentElement.classList.remove('alert-danger');
        dailyProfitText.parentElement.classList.add('alert-success');
      } else if (status.pnl.daily < 0) {
        dailyProfitText.textContent = `${status.pnl.daily.toFixed(2)}%`;
        dailyProfitText.parentElement.classList.remove('alert-success');
        dailyProfitText.parentElement.classList.add('alert-danger');
      } else {
        dailyProfitText.textContent = '0.00%';
        dailyProfitText.parentElement.classList.remove('alert-danger');
        dailyProfitText.parentElement.classList.add('alert-success');
      }
    }
    
    // Обновляем общую прибыль
    if (status.pnl && status.pnl.total !== undefined) {
      if (status.pnl.total > 0) {
        totalProfitText.textContent = `+${status.pnl.total.toFixed(2)}%`;
        totalProfitText.parentElement.classList.remove('alert-danger');
        totalProfitText.parentElement.classList.add('alert-primary');
      } else if (status.pnl.total < 0) {
        totalProfitText.textContent = `${status.pnl.total.toFixed(2)}%`;
        totalProfitText.parentElement.classList.remove('alert-primary');
        totalProfitText.parentElement.classList.add('alert-danger');
      } else {
        totalProfitText.textContent = '0.00%';
        totalProfitText.parentElement.classList.remove('alert-danger');
        totalProfitText.parentElement.classList.add('alert-primary');
      }
    }
    
    // Обновляем винрейт
    if (status.stats && status.stats.winRate !== undefined) {
      winRateStatsText.textContent = `${status.stats.winRate.toFixed(1)}%`;
    } else {
      winRateStatsText.textContent = '0.0%';
    }
    
    // Обновляем общую статистику
    if (status.stats) {
      totalTradesText.textContent = status.stats.totalTrades || 0;
      
      // Рассчитываем количество побед/поражений
      const wins = status.stats.totalTrades ? Math.round(status.stats.totalTrades * (status.stats.winRate / 100)) : 0;
      const losses = status.stats.totalTrades ? status.stats.totalTrades - wins : 0;
      winLossText.textContent = `${wins} / ${losses}`;
      
      // Фактор прибыли (пока просто оценка)
      if (status.stats.winRate > 0 && status.stats.totalTrades > 0) {
        const estimatedProfitFactor = (status.stats.winRate / (100 - status.stats.winRate)) * 1.5;
        profitFactorText.textContent = estimatedProfitFactor.toFixed(2);
      } else {
        profitFactorText.textContent = '0.00';
      }
    } else {
      totalTradesText.textContent = '0';
      winLossText.textContent = '0 / 0';
      profitFactorText.textContent = '0.00';
    }
    
    // Информация о реинвестировании
    if (status.reinvestment) {
      reinvestmentStatusText.textContent = `${status.reinvestment.percentage}%`;
      if (status.reinvestment.totalWithdrawn !== undefined) {
        withdrawnProfitText.textContent = `${status.reinvestment.totalWithdrawn.toFixed(2)} USDT`;
      }
      
      // Если есть дата последнего вывода, добавляем её в tooltip
      if (status.reinvestment.lastWithdrawal) {
        const lastWithdrawalDate = new Date(status.reinvestment.lastWithdrawal);
        withdrawnProfitText.title = `Последний вывод: ${lastWithdrawalDate.toLocaleString()}`;
      }
    } else {
      reinvestmentStatusText.textContent = '100%';
      withdrawnProfitText.textContent = '0.00 USDT';
    }
    
    // Обновляем индикаторы
    if (status.indicators) {
      if (status.indicators.rsi !== undefined) {
        rsiText.textContent = status.indicators.rsi.toFixed(1);
        
        // Цветовое выделение RSI
        if (status.indicators.rsi < 30) {
          rsiText.className = 'text-success';
        } else if (status.indicators.rsi > 70) {
          rsiText.className = 'text-danger';
        } else {
          rsiText.className = '';
        }
      }
      
      if (status.indicators.fastEma !== undefined && status.indicators.slowEma !== undefined) {
        emaText.textContent = `${status.indicators.fastEma.toFixed(2)} / ${status.indicators.slowEma.toFixed(2)}`;
        
        // Показываем стрелки для EMA
        if (status.indicators.fastEma > status.indicators.slowEma) {
          emaUpIcon.classList.remove('d-none');
          emaDownIcon.classList.add('d-none');
        } else {
          emaUpIcon.classList.add('d-none');
          emaDownIcon.classList.remove('d-none');
        }
      }
    }
    
    // Обновляем открытые позиции
    if (status.openPositions) {
      updateOpenPositionsTable(status.openPositions);
    }
    
    // Обновляем последние сделки
    if (status.lastTrades) {
      updateLastTradesTable(status.lastTrades);
    }
    
    // Время работы
    if (status.status === 'running' && status.uptime) {
      const hours = Math.floor(status.uptime / (1000 * 60 * 60));
      const minutes = Math.floor((status.uptime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((status.uptime % (1000 * 60)) / 1000);
      uptimeText.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      uptimeText.textContent = '00:00:00';
    }
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
  }
}

// Обновление таблицы открытых позиций
function updateOpenPositionsTable(positions) {
  try {
    if (!positions || positions.length === 0) {
      openPositionsTable.innerHTML = '<tr><td colspan="5" class="text-center">Нет открытых позиций</td></tr>';
      return;
    }
    
    let html = '';
    
    positions.forEach(position => {
      const pnlClass = position.currentPnl >= 0 ? 'text-success' : 'text-danger';
      const positionTypeClass = position.type === 'LONG' ? 'position-long' : 'position-short';
      
      html += `
          <tr>
              <td class="${positionTypeClass}">${position.type}</td>
              <td>${position.entryPrice.toFixed(4)}</td>
              <td>${position.size.toFixed(2)}</td>
              <td class="${pnlClass}">${position.currentPnl ? position.currentPnl.toFixed(2) : '0.00'}%</td>
              <td>
                  <button class="btn btn-sm btn-danger close-position-btn" data-position-id="${position.id}">
                      <i class="bi bi-x-circle"></i> Закрыть
                  </button>
              </td>
          </tr>
      `;
    });
    
    openPositionsTable.innerHTML = html;
    
    // Добавляем обработчики для кнопок закрытия позиций
    document.querySelectorAll('.close-position-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const positionId = e.currentTarget.dataset.positionId;
        if (confirm('Вы уверены, что хотите закрыть эту позицию?')) {
          // Здесь будет запрос на закрытие позиции
          showNotification('Закрытие позиции', 'Функция закрытия позиции в разработке');
        }
      });
    });
  } catch (error) {
    console.error('Ошибка при обновлении таблицы позиций:', error);
    openPositionsTable.innerHTML = '<tr><td colspan="5" class="text-center">Ошибка загрузки позиций</td></tr>';
  }
}

// Обновление таблицы последних сделок
function updateLastTradesTable(trades) {
  try {
    if (!trades || trades.length === 0) {
      lastTradesTable.innerHTML = '<tr><td colspan="5" class="text-center">Нет данных о сделках</td></tr>';
      return;
    }
    
    let html = '';
    
    trades.forEach(trade => {
      const resultClass = trade.result === 'win' ? 'trade-win' : (trade.result === 'loss' ? 'trade-loss' : '');
      const positionTypeClass = trade.type === 'LONG' ? 'position-long' : 'position-short';
      
      html += `
          <tr>
              <td class="${positionTypeClass}">${trade.type}</td>
              <td>${trade.entryPrice.toFixed(4)}</td>
              <td>${trade.closePrice ? trade.closePrice.toFixed(4) : '-'}</td>
              <td class="${resultClass}">${trade.pnl ? trade.pnl.toFixed(2) : '0.00'}%</td>
              <td class="${resultClass}">${trade.result ? trade.result.toUpperCase() : 'OPEN'}</td>
          </tr>
      `;
    });
    
    lastTradesTable.innerHTML = html;
  } catch (error) {
    console.error('Ошибка при обновлении таблицы сделок:', error);
    lastTradesTable.innerHTML = '<tr><td colspan="5" class="text-center">Ошибка загрузки сделок</td></tr>';
  }
}

// Привязка обработчиков событий
function attachEventListeners() {
  try {
    // Запуск бота
    startBtn.addEventListener('click', async () => {
      try {
        // Проверяем, заполнены ли API ключи
        if (!apiKeyInput.value || !apiSecretInput.value || !apiPassphraseInput.value) {
          showNotification('Ошибка', 'Необходимо заполнить API ключи BitGet для запуска бота');
          return;
        }
        
        // Отправляем запрос на запуск бота
        const response = await fetch('/api/bot/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', 'Бот успешно запущен');
          await fetchBotStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось запустить бота: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        showNotification('Ошибка', 'Произошла ошибка при запуске бота');
      }
    });
    
    // Остановка бота
    stopBtn.addEventListener('click', async () => {
      try {
        if (confirm('Вы уверены, что хотите остановить бота?')) {
          // Отправляем запрос на остановку бота
          const response = await fetch('/api/bot/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const result = await response.json();
          
          if (result.success) {
            showNotification('Успех', 'Бот успешно остановлен');
            await fetchBotStatus(); // Обновляем статус
          } else {
            showNotification('Ошибка', `Не удалось остановить бота: ${result.message}`);
          }
        }
      } catch (error) {
        console.error('Ошибка при остановке бота:', error);
        showNotification('Ошибка', 'Произошла ошибка при остановке бота');
      }
    });
    
    // Сохранение основных настроек
    saveSettingsBtn.addEventListener('click', async () => {
      try {
        // Собираем настройки
        const settings = {
          strategy: strategySelect.value,
          symbol: symbolSelect.value,
          leverage: parseInt(leverageInput.value),
          positionSize: parseInt(positionSizeInput.value),
          reinvestment: parseInt(reinvestmentInput.value)
        };
        
        // Отправляем запрос на сохранение настроек
        const response = await fetch('/api/bot/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', 'Настройки успешно сохранены');
        } else {
          showNotification('Ошибка', `Не удалось сохранить настройки: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        showNotification('Ошибка', 'Произошла ошибка при сохранении настроек');
      }
    });
    
    // Сохранение API ключей
    saveApiBtn.addEventListener('click', async () => {
      try {
        // Проверяем, не замаскированы ли значения
        const apiKey = apiKeyInput.dataset.masked === 'true' && apiKeyInput.value === '********' 
          ? null : apiKeyInput.value;
        
        const apiSecret = apiSecretInput.dataset.masked === 'true' && apiSecretInput.value === '********'
          ? null : apiSecretInput.value;
            
        const passphrase = apiPassphraseInput.dataset.masked === 'true' && apiPassphraseInput.value === '********'
          ? null : apiPassphraseInput.value;
        
        // Проверяем, что все поля заполнены
        if (
          (apiKey === null && apiSecretInput.dataset.masked !== 'true') || 
          (apiSecret === null && apiKeyInput.dataset.masked !== 'true') || 
          (passphrase === null && apiPassphraseInput.dataset.masked !== 'true')
        ) {
          showNotification('Ошибка', 'Необходимо заполнить все API ключи');
          return;
        }
        
        // Собираем API ключи
        const apiSettings = {};
        
        if (apiKey !== null) apiSettings.apiKey = apiKey;
        if (apiSecret !== null) apiSettings.apiSecret = apiSecret;
        if (passphrase !== null) apiSettings.passphrase = passphrase;
        
        // Отправляем запрос на сохранение API ключей
        const response = await fetch('/api/bot/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Маскируем поля
          apiKeyInput.value = '********';
          apiKeyInput.dataset.masked = 'true';
          
          apiSecretInput.value = '********';
          apiSecretInput.dataset.masked = 'true';
          
          apiPassphraseInput.value = '********';
          apiPassphraseInput.dataset.masked = 'true';
          
          showNotification('Успех', 'API ключи успешно сохранены');
        } else {
          showNotification('Ошибка', `Не удалось сохранить API ключи: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при сохранении API ключей:', error);
        showNotification('Ошибка', 'Произошла ошибка при сохранении API ключей');
      }
    });
    
    // Сохранение расширенных настроек
    saveAdvancedSettingsBtn.addEventListener('click', async () => {
      try {
        // Собираем расширенные настройки
        const advancedSettings = {
          takeProfitPercentage: parseFloat(tpInput.value),
          stopLossPercentage: parseFloat(slInput.value),
          maxTradeDurationMinutes: parseInt(maxDurationInput.value),
          trailingStop: {
            enabled: trailingStopCheck.checked,
            activationPercentage: parseFloat(tsActivationInput.value),
            stopDistance: parseFloat(tsDistanceInput.value)
          },
          riskManagement: {
            dailyLossLimit: parseInt(dailyLossLimitInput.value),
            maxOpenPositions: parseInt(maxPositionsInput.value)
          },
          dca: {
            maxOrders: parseInt(dcaMaxOrdersInput.value),
            priceStep: parseFloat(dcaPriceStepInput.value),
            multiplier: parseFloat(dcaMultiplierInput.value)
          }
        };
        
        // Отправляем запрос на сохранение расширенных настроек
        const response = await fetch('/api/bot/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(advancedSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', 'Расширенные настройки успешно сохранены');
        } else {
          showNotification('Ошибка', `Не удалось сохранить расширенные настройки: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при сохранении расширенных настроек:', error);
        showNotification('Ошибка', 'Произошла ошибка при сохранении расширенных настроек');
      }
    });
    
    // Очистка поля API ключа при фокусе, если оно замаскировано
    apiKeyInput.addEventListener('focus', () => {
      if (apiKeyInput.dataset.masked === 'true') {
        apiKeyInput.value = '';
        apiKeyInput.dataset.masked = 'false';
      }
    });
    
    // Очистка поля API секрета при фокусе, если оно замаскировано
    apiSecretInput.addEventListener('focus', () => {
      if (apiSecretInput.dataset.masked === 'true') {
        apiSecretInput.value = '';
        apiSecretInput.dataset.masked = 'false';
      }
    });
    
    // Очистка поля API passphrase при фокусе, если оно замаскировано
    apiPassphraseInput.addEventListener('focus', () => {
      if (apiPassphraseInput.dataset.masked === 'true') {
        apiPassphraseInput.value = '';
        apiPassphraseInput.dataset.masked = 'false';
      }
    });
  } catch (error) {
    console.error('Ошибка при настройке обработчиков событий:', error);
  }
}

// Инициализация элементов управления менеджером
function initManagerControls() {
    // Инициализация менеджера ботов
    initManagerBtn.addEventListener('click', async () => {
        showLoading('Инициализация менеджера ботов...');
        try {
            const result = await initializeManager();
            if (result.success) {
                showNotification('Успех', 'Менеджер ботов успешно инициализирован');
                fetchManagerStatus();
            } else {
                showNotification('Ошибка', `Не удалось инициализировать менеджер ботов: ${result.message}`);
            }
        } catch (error) {
            console.error('Ошибка при инициализации менеджера ботов:', error);
            showNotification('Ошибка', 'Произошла ошибка при инициализации менеджера ботов');
        } finally {
            hideLoading();
        }
    });
    
    // Запуск менеджера ботов
    startManagerBtn.addEventListener('click', async () => {
        const botCount = parseInt(botCountInput.value) || 2;
        
        showLoading(`Запуск менеджера ботов с ${botCount} ботами...`);
        try {
            const result = await startManager(botCount);
            if (result.success) {
                showNotification('Успех', `Менеджер ботов успешно запущен с ${botCount} ботами`);
                fetchManagerStatus();
            } else {
                showNotification('Ошибка', `Не удалось запустить менеджер ботов: ${result.message}`);
            }
        } catch (error) {
            console.error('Ошибка при запуске менеджера ботов:', error);
            showNotification('Ошибка', 'Произошла ошибка при запуске менеджера ботов');
        } finally {
            hideLoading();
        }
    });
    
    // Остановка менеджера ботов
    stopManagerBtn.addEventListener('click', async () => {
        if (confirm('Вы уверены, что хотите остановить менеджер ботов?')) {
            showLoading('Остановка менеджера ботов...');
            try {
                const result = await stopManager();
                if (result.success) {
                    showNotification('Успех', 'Менеджер ботов успешно остановлен');
                    fetchManagerStatus();
                } else {
                    showNotification('Ошибка', `Не удалось остановить менеджер ботов: ${result.message}`);
                }
            } catch (error) {
                console.error('Ошибка при остановке менеджера ботов:', error);
                showNotification('Ошибка', 'Произошла ошибка при остановке менеджера ботов');
            } finally {
                hideLoading();
            }
        }
    });
    
    // Сканирование пар
    scanPairsBtn.addEventListener('click', async () => {
        showLoading('Сканирование пар...');
        try {
            const result = await forceScanPairs();
            if (result.success) {
                showNotification('Успех', `Сканирование пар завершено. Найдено ${result.pairs.length} пар`);
                updatePairsTable(result.pairs);
                fetchManagerStatus();
            } else {
                showNotification('Ошибка', `Не удалось завершить сканирование пар: ${result.message}`);
            }
        } catch (error) {
            console.error('Ошибка при сканировании пар:', error);
            showNotification('Ошибка', 'Произошла ошибка при сканировании пар');
        } finally {
            hideLoading();
        }
    });
    
    // Обновление логов менеджера
    refreshManagerLogsBtn.addEventListener('click', () => {
        fetchManagerLogs();
        fetchScannerLogs();
    });
    
    // Обработчики для модальных окон и обновления состояния
    document.addEventListener('click', (event) => {
        // Обработка кнопок остановки/перезапуска ботов
        if (event.target.classList.contains('stop-bot-btn')) {
            const botId = event.target.dataset.botId;
            stopBot(botId);
        } else if (event.target.classList.contains('restart-bot-btn')) {
            const botId = event.target.dataset.botId;
            restartBot(botId);
        } else if (event.target.classList.contains('analyze-pair-btn')) {
            const symbol = event.target.dataset.symbol;
            analyzePair(symbol);
        } else if (event.target.classList.contains('start-bot-for-pair-btn')) {
            const symbol = event.target.dataset.symbol;
            startBotForPair(symbol);
        } else if (event.target.classList.contains('view-bot-details-btn')) {
            const botId = event.target.dataset.botId;
            showBotDetails(botId);
        }
    });
}

// Функции для взаимодействия с API

// Инициализация менеджера ботов
async function initializeManager() {
    try {
        const response = await fetch('/api/manager/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка при инициализации менеджера:', error);
        throw error;
    }
}

// Запуск менеджера ботов
async function startManager(botCount) {
    try {
        const response = await fetch('/api/manager/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ botCount })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка при запуске менеджера:', error);
        throw error;
    }
}

// Остановка менеджера ботов
async function stopManager() {
    try {
        const response = await fetch('/api/manager/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка при остановке менеджера:', error);
        throw error;
    }
}

// Принудительное сканирование пар
async function forceScanPairs() {
    try {
        const response = await fetch('/api/manager/force-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка при сканировании пар:', error);
        throw error;
    }
}

// Получение статуса менеджера
async function fetchManagerStatus() {
    try {
        const response = await fetch('/api/manager/status');
        const status = await response.json();
        
        updateManagerStatus(status);
        
        return status;
    } catch (error) {
        console.error('Ошибка при получении статуса менеджера:', error);
        throw error;
    }
}

// Получение логов менеджера
async function fetchManagerLogs() {
    try {
        const response = await fetch('/api/manager/logs');
        const data = await response.json();
        
        if (data.success) {
            updateManagerLogs(data.logs);
        } else {
            console.error('Ошибка при получении логов менеджера:', data.message);
        }
    } catch (error) {
        console.error('Ошибка при получении логов менеджера:', error);
    }
}

// Получение логов сканера
async function fetchScannerLogs() {
    try {
        const response = await fetch('/api/manager/scanner-logs');
        const data = await response.json();
        
        if (data.success) {
            updateScannerLogs(data.logs);
        } else {
            console.error('Ошибка при получении логов сканера:', data.message);
        }
    } catch (error) {
        console.error('Ошибка при получении логов сканера:', error);
    }
}

// Остановка конкретного бота
async function stopBot(botId) {
    if (confirm(`Вы уверены, что хотите остановить бота ${botId}?`)) {
        showLoading(`Остановка бота ${botId}...`);
        try {
            const response = await fetch(`/api/manager/stop-bot/${botId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Успех', `Бот ${botId} успешно остановлен`);
                fetchManagerStatus();
            } else {
                showNotification('Ошибка', `Не удалось остановить бота: ${result.message}`);
            }
        } catch (error) {
            console.error(`Ошибка при остановке бота ${botId}:`, error);
            showNotification('Ошибка', 'Произошла ошибка при остановке бота');
        } finally {
            hideLoading();
        }
    }
}

// Перезапуск конкретного бота
async function restartBot(botId) {
    if (confirm(`Вы уверены, что хотите перезапустить бота ${botId}?`)) {
        showLoading(`Перезапуск бота ${botId}...`);
        try {
            const response = await fetch(`/api/manager/restart-bot/${botId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Успех', `Бот ${botId} успешно перезапущен`);
                fetchManagerStatus();
            } else {
                showNotification('Ошибка', `Не удалось перезапустить бота: ${result.message}`);
            }
        } catch (error) {
            console.error(`Ошибка при перезапуске бота ${botId}:`, error);
            showNotification('Ошибка', 'Произошла ошибка при перезапуске бота');
        } finally {
            hideLoading();
        }
    }
}

// Анализ конкретной пары
async function analyzePair(symbol) {
    showLoading(`Анализ пары ${symbol}...`);
    try {
        const response = await fetch('/api/manager/analyze-pair', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbol })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showPairAnalysis(result.result);
        } else {
            showNotification('Предупреждение', `Пара ${symbol} не соответствует критериям или произошла ошибка при анализе`);
        }
    } catch (error) {
        console.error(`Ошибка при анализе пары ${symbol}:`, error);
        showNotification('Ошибка', 'Произошла ошибка при анализе пары');
    } finally {
        hideLoading();
    }
}

// Запуск бота для конкретной пары
async function startBotForPair(symbol) {
    const botCount = 1;
    showLoading(`Запуск бота для пары ${symbol}...`);
    
    try {
        // Сначала останавливаем текущего бота, если есть
        const stopResponse = await fetch('/api/manager/stop-bot/1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Затем запускаем нового бота для выбранной пары
        const response = await fetch('/api/manager/add-bots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                botCount,
                forcePair: symbol
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Успех', `Бот для пары ${symbol} успешно запущен`);
            fetchManagerStatus();
        } else {
            showNotification('Ошибка', `Не удалось запустить бота для пары ${symbol}: ${result.message}`);
        }
    } catch (error) {
        console.error(`Ошибка при запуске бота для пары ${symbol}:`, error);
        showNotification('Ошибка', 'Произошла ошибка при запуске бота');
    } finally {
        hideLoading();
    }
}

// Отображение анализа пары
function showPairAnalysis(analysisResult) {
    const modal = document.getElementById('analysisModal');
    const modalTitle = document.getElementById('analysisModalTitle');
    const modalBody = document.getElementById('analysisModalBody');
    
    modalTitle.textContent = `Анализ пары ${analysisResult.symbol}`;
    
    let modalContent = `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Общая информация</h5>
            </div>
            <div class="card-body">
                <p><strong>Цена:</strong> ${analysisResult.price.toFixed(6)} USDT</p>
                <p><strong>Рейтинг пары:</strong> ${analysisResult.score}/100</p>
                <p><strong>Итоговый сигнал:</strong> ${analysisResult.analysis.signal ? analysisResult.analysis.signal.toUpperCase() : 'Нет сигнала'}</p>
                <p><strong>Причина:</strong> ${analysisResult.analysis.reason}</p>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header bg-info text-white">
                <h5 class="mb-0">Индикаторы</h5>
            </div>
            <div class="card-body">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Индикатор</th>
                            <th>Значение</th>
                            <th>Сигнал</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    // RSI
    const rsiData = analysisResult.analysis.indicators.rsi;
    modalContent += `
        <tr>
            <td>RSI</td>
            <td>${rsiData.value.toFixed(2)}</td>
            <td class="${rsiData.signal === 'buy' ? 'text-success' : (rsiData.signal === 'sell' ? 'text-danger' : '')}">
                ${rsiData.signal === 'buy' ? 'ПОКУПКА' : (rsiData.signal === 'sell' ? 'ПРОДАЖА' : 'НЕЙТРАЛЬНО')}
            </td>
        </tr>
    `;
    
    // EMA
    const emaData = analysisResult.analysis.indicators.ema;
    modalContent += `
        <tr>
            <td>EMA</td>
            <td>Быстрая: ${emaData.fast.toFixed(2)}<br>Средняя: ${emaData.medium.toFixed(2)}<br>Медленная: ${emaData.slow.toFixed(2)}</td>
            <td class="${emaData.signal === 'buy' ? 'text-success' : (emaData.signal === 'sell' ? 'text-danger' : '')}">
                ${emaData.signal === 'buy' ? 'ПОКУПКА' : (emaData.signal === 'sell' ? 'ПРОДАЖА' : 'НЕЙТРАЛЬНО')}
            </td>
        </tr>
    `;
    
    // Bollinger Bands
    const bbData = analysisResult.analysis.indicators.bb;
    modalContent += `
        <tr>
            <td>Bollinger Bands</td>
            <td>Верхняя: ${bbData.upper.toFixed(2)}<br>Средняя: ${bbData.middle.toFixed(2)}<br>Нижняя: ${bbData.lower.toFixed(2)}</td>
            <td class="${bbData.signal === 'buy' ? 'text-success' : (bbData.signal === 'sell' ? 'text-danger' : '')}">
                ${bbData.signal === 'buy' ? 'ПОКУПКА' : (bbData.signal === 'sell' ? 'ПРОДАЖА' : 'НЕЙТРАЛЬНО')}
            </td>
        </tr>
    `;
    
    // ADX
    const adxData = analysisResult.analysis.indicators.adx;
    modalContent += `
        <tr>
            <td>ADX</td>
            <td>${adxData.value.toFixed(2)}</td>
            <td class="${adxData.signal === 'ok' ? 'text-success' : 'text-danger'}">
                ${adxData.signal === 'ok' ? 'СИЛЬНЫЙ ТРЕНД' : 'СЛАБЫЙ ТРЕНД'}
            </td>
        </tr>
    `;
    
    // Volume
    const volData = analysisResult.analysis.indicators.volume;
    modalContent += `
        <tr>
            <td>Объем</td>
            <td>Текущий: ${volData.current.toFixed(2)}<br>Средний: ${volData.average.toFixed(2)}</td>
            <td class="${volData.signal === 'ok' ? 'text-success' : 'text-danger'}">
                ${volData.signal === 'ok' ? 'ДОСТАТОЧНЫЙ' : 'НЕДОСТАТОЧНЫЙ'}
            </td>
        </tr>
    `;
    
    // ATR
    const atrData = analysisResult.analysis.indicators.atr;
    modalContent += `
        <tr>
            <td>ATR (волатильность)</td>
            <td>${atrData.value.toFixed(6)} (${atrData.percent.toFixed(2)}%)</td>
            <td class="${atrData.percent > 0.1 ? 'text-success' : (atrData.percent < 0.05 ? 'text-danger' : '')}">
                ${atrData.percent > 0.1 ? 'ВЫСОКАЯ' : (atrData.percent < 0.05 ? 'НИЗКАЯ' : 'СРЕДНЯЯ')}
            </td>
        </tr>
    `;
    
    modalContent += `
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="d-grid gap-2">
            <button class="btn btn-primary start-bot-for-pair-btn" data-symbol="${analysisResult.symbol}">
                <i class="bi bi-play-fill"></i> Запустить бота для этой пары
            </button>
        </div>
    `;
    
    modalBody.innerHTML = modalContent;
    
    // Показываем модальное окно
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Отображение деталей бота
function showBotDetails(botId) {
    const botInfo = managerBots[botId];
    if (!botInfo) return;
    
    const modal = document.getElementById('botDetailsModal');
    const modalTitle = document.getElementById('botDetailsModalTitle');
    const modalBody = document.getElementById('botDetailsModalBody');
    
    modalTitle.textContent = `Детали бота ${botId} (${botInfo.pair})`;
    
    let modalContent = `
        <div class="card mb-3">
            <div class="card-header bg-${botInfo.status === 'running' ? 'success' : 'secondary'} text-white">
                <h5 class="mb-0">Общая информация</h5>
            </div>
            <div class="card-body">
                <p><strong>Статус:</strong> ${botInfo.status === 'running' ? 'Запущен' : 'Остановлен'}</p>
                <p><strong>Пара:</strong> ${botInfo.pair}</p>
                <p><strong>Время работы:</strong> ${formatUptime(botInfo.uptime)}</p>
                <p><strong>Баланс:</strong> ${botInfo.botStatus?.balance?.toFixed(2) || 0} USDT</p>
            </div>
        </div>
    `;
    
    // Если у бота есть открытые позиции
    if (botInfo.botStatus?.openPositions && botInfo.botStatus.openPositions.length > 0) {
        modalContent += `
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">Открытые позиции</h5>
                </div>
                <div class="card-body p-0">
                    <table class="table table-striped mb-0">
                        <thead>
                            <tr>
                                <th>Тип</th>
                                <th>Вход</th>
                                <th>Размер</th>
                                <th>P&L</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        botInfo.botStatus.openPositions.forEach(pos => {
            const pnlClass = pos.currentPnl >= 0 ? 'text-success' : 'text-danger';
            modalContent += `
                <tr>
                    <td class="${pos.type === 'LONG' ? 'position-long' : 'position-short'}">${pos.type}</td>
                    <td>${pos.entryPrice.toFixed(4)}</td>
                    <td>${pos.size.toFixed(2)}</td>
                    <td class="${pnlClass}">${pos.currentPnl?.toFixed(2) || '0.00'}%</td>
                </tr>
            `;
        });
        
        modalContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Последние сделки
    if (botInfo.botStatus?.lastTrades && botInfo.botStatus.lastTrades.length > 0) {
        modalContent += `
            <div class="card mb-3">
                <div class="card-header bg-info text-white">
                    <h5 class="mb-0">Последние сделки</h5>
                </div>
                <div class="card-body p-0">
                    <table class="table table-striped mb-0">
                        <thead>
                            <tr>
                                <th>Тип</th>
                                <th>Вход</th>
                                <th>Выход</th>
                                <th>P&L</th>
                                <th>Результат</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        botInfo.botStatus.lastTrades.forEach(trade => {
            const resultClass = trade.result === 'win' ? 'trade-win' : (trade.result === 'loss' ? 'trade-loss' : '');
            modalContent += `
                <tr>
                    <td class="${trade.type === 'LONG' ? 'position-long' : 'position-short'}">${trade.type}</td>
                    <td>${trade.entryPrice.toFixed(4)}</td>
                    <td>${trade.closePrice ? trade.closePrice.toFixed(4) : '-'}</td>
                    <td class="${resultClass}">${trade.pnl ? trade.pnl.toFixed(2) : '0.00'}%</td>
                    <td class="${resultClass}">${trade.result ? trade.result.toUpperCase() : 'OPEN'}</td>
                </tr>
            `;
        });
        
        modalContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Кнопки управления
    modalContent += `
        <div class="d-flex justify-content-between">
            <button class="btn btn-danger stop-bot-btn" data-bot-id="${botId}">
                <i class="bi bi-stop-fill"></i> Остановить бота
            </button>
            <button class="btn btn-warning restart-bot-btn" data-bot-id="${botId}">
                <i class="bi bi-arrow-clockwise"></i> Перезапустить бота
            </button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x"></i> Закрыть
            </button>
        </div>
    `;
    
    modalBody.innerHTML = modalContent;
    
    // Показываем модальное окно
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Обновление статуса менеджера ботов
function updateManagerStatus(status) {
    try {
        // Проверка на наличие данных
        if (!status) {
            console.warn('Получены пустые данные статуса менеджера');
            return;
        }
        
        // Обновляем индикатор статуса менеджера
        if (status.status === 'not_initialized') {
            managerStatusIndicator.classList.remove('active');
            managerStatusText.textContent = 'Менеджер: Не инициализирован';
            initManagerBtn.disabled = false;
            startManagerBtn.disabled = true;
            stopManagerBtn.disabled = true;
            scanPairsBtn.disabled = true;
            managerInitialized = false;
            managerRunning = false;
        } else {
            managerInitialized = true;
            initManagerBtn.disabled = true;
            
            // Проверяем активность менеджера
            const isActive = status.activeBots > 0;
            
            if (isActive) {
                managerStatusIndicator.classList.add('active');
                managerStatusText.textContent = 'Менеджер: Активен';
                startManagerBtn.disabled = true;
                stopManagerBtn.disabled = false;
                scanPairsBtn.disabled = false;
                managerRunning = true;
            } else {
                managerStatusIndicator.classList.remove('active');
                managerStatusText.textContent = 'Менеджер: Инициализирован';
                startManagerBtn.disabled = false;
                stopManagerBtn.disabled = true;
                scanPairsBtn.disabled = false;
                managerRunning = false;
            }
        }
        
        // Обновляем счетчики
        activeBotCount.textContent = `${status.activeBots || 0}/${status.maxBots || 5}`;
        
        // Обновляем информацию о парах
        if (status.scanner && status.scanner.filteredPairs) {
            filteredPairsCount.textContent = status.scanner.filteredPairs.length || 0;
            managerPairs = status.scanner.filteredPairs;
            updatePairsTable(status.scanner.filteredPairs);
        }
        
        // Обновляем информацию о ботах
        if (status.bots) {
            managerBots = status.bots;
            updateBotsTable(status.bots);
        }
        
        // Обновляем логи если нужно
        if (managerInitialized && (managerLogsContent.textContent === 'Ожидание логов менеджера...' || 
            scannerLogsContent.textContent === 'Ожидание логов сканера...')) {
            fetchManagerLogs();
            fetchScannerLogs();
        }
        
    } catch (error) {
        console.error('Ошибка при обновлении статуса менеджера:', error);
    }
}

// Обновление таблицы ботов
function updateBotsTable(bots) {
    try {
        const botIds = Object.keys(bots);
        
        if (botIds.length === 0) {
            botsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Нет запущенных ботов</td></tr>';
            return;
        }
        
        let html = '';
        
        botIds.forEach(botId => {
            const bot = bots[botId];
            const botStatus = bot.botStatus || {};
            
            // Получаем данные для отображения
            const statusClass = bot.status === 'running' ? 'bg-success text-white' : 'bg-secondary text-white';
            const uptime = formatUptime(bot.uptime);
            const balance = botStatus.balance ? botStatus.balance.toFixed(2) : '0.00';
            
            // Рассчитываем P&L
            let pnl = 0;
            let pnlClass = '';
            
            if (botStatus.pnl) {
                pnl = botStatus.pnl.total || 0;
                pnlClass = pnl >= 0 ? 'text-success' : 'text-danger';
            }
            
            html += `
                <tr>
                    <td>${botId}</td>
                    <td>${bot.pair}</td>
                    <td class="${statusClass} text-center">${bot.status === 'running' ? 'Активен' : 'Остановлен'}</td>
                    <td>${uptime}</td>
                    <td>${balance} USDT</td>
                    <td class="${pnlClass}">${pnl.toFixed(2)}%</td>
                    <td>
                        <button class="btn btn-sm btn-info view-bot-details-btn" data-bot-id="${botId}">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning restart-bot-btn" data-bot-id="${botId}">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <button class="btn btn-sm btn-danger stop-bot-btn" data-bot-id="${botId}">
                            <i class="bi bi-stop-fill"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        botsTableBody.innerHTML = html;
    } catch (error) {
        console.error('Ошибка при обновлении таблицы ботов:', error);
        botsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Ошибка при загрузке информации о ботах</td></tr>';
    }
}

// Обновление таблицы пар
function updatePairsTable(pairs) {
    try {
        if (!pairs || pairs.length === 0) {
            pairsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Нет отфильтрованных пар</td></tr>';
            return;
        }
        
        let html = '';
        
        // Сортируем пары по рейтингу
        const sortedPairs = [...pairs].sort((a, b) => b.score - a.score);
        
        sortedPairs.forEach((pair, index) => {
            // Получаем данные анализа
            const analysis = pair.analysis || {};
            const indicators = analysis.indicators || {};
            
            // Получаем значения индикаторов
            const rsi = indicators.rsi ? indicators.rsi.value.toFixed(1) : '-';
            const rsiClass = indicators.rsi ? 
                (indicators.rsi.signal === 'buy' ? 'text-success' : 
                 (indicators.rsi.signal === 'sell' ? 'text-danger' : '')) : '';
            
            const ema = indicators.ema ? 
                `${indicators.ema.fast.toFixed(1)} / ${indicators.ema.slow.toFixed(1)}` : '-';
            const emaClass = indicators.ema ? 
                (indicators.ema.signal === 'buy' ? 'text-success' : 
                 (indicators.ema.signal === 'sell' ? 'text-danger' : '')) : '';
            
            const adx = indicators.adx ? indicators.adx.value.toFixed(1) : '-';
            const adxClass = indicators.adx ? 
                (indicators.adx.signal === 'ok' ? 'text-success' : 'text-danger') : '';
            
            html += `
                <tr>
                    <td>${pair.symbol}</td>
                    <td>${pair.score}/100</td>
                    <td class="${rsiClass}">${rsi}</td>
                    <td class="${emaClass}">${ema}</td>
                    <td class="${adxClass}">${adx}</td>
                    <td>
                        <button class="btn btn-sm btn-info analyze-pair-btn" data-symbol="${pair.symbol}">
                            <i class="bi bi-search"></i>
                        </button>
                        <button class="btn btn-sm btn-success start-bot-for-pair-btn" data-symbol="${pair.symbol}">
                            <i class="bi bi-play-fill"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        pairsTableBody.innerHTML = html;
    } catch (error) {
        console.error('Ошибка при обновлении таблицы пар:', error);
        pairsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Ошибка при загрузке информации о парах</td></tr>';
    }
}

// Обновление логов менеджера
function updateManagerLogs(logs) {
    try {
        if (!logs || logs.length === 0) {
            managerLogsContent.textContent = 'Логи менеджера недоступны или пусты.';
            return;
        }
        
        let logsContent = '';
        
        // Переворачиваем массив, чтобы новые логи были внизу
        const reversedLogs = [...logs].reverse();
        
        reversedLogs.forEach(log => {
            const timeString = new Date(log.timestamp).toLocaleTimeString();
            let logClass = '';
            
            if (log.level === 'error') logClass = 'error';
            else if (log.level === 'warning') logClass = 'warning';
            else if (log.level === 'success') logClass = 'success';
            
            logsContent += `<div class="log-entry ${logClass}">` +
                `<span class="timestamp">[${timeString}]</span> ${log.message}</div>`;
        });
        
        managerLogsContent.innerHTML = logsContent;
        
        // Прокручиваем до последней записи
        managerLogsContent.scrollTop = managerLogsContent.scrollHeight;
    } catch (error) {
        console.error('Ошибка при обновлении логов менеджера:', error);
        managerLogsContent.textContent = 'Ошибка при загрузке логов менеджера.';
    }
}

// Обновление логов сканера
function updateScannerLogs(logs) {
    try {
        if (!logs || logs.length === 0) {
            scannerLogsContent.textContent = 'Логи сканера недоступны или пусты.';
            return;
        }
        
        let logsContent = '';
        
        // Переворачиваем массив, чтобы новые логи были внизу
        const reversedLogs = [...logs].reverse();
        
        reversedLogs.forEach(log => {
            const timeString = new Date(log.timestamp).toLocaleTimeString();
            let logClass = '';
            
            if (log.level === 'error') logClass = 'error';
            else if (log.level === 'warning') logClass = 'warning';
            else if (log.level === 'success') logClass = 'success';
            
            logsContent += `<div class="log-entry ${logClass}">` +
                `<span class="timestamp">[${timeString}]</span> ${log.message}</div>`;
        });
        
        scannerLogsContent.innerHTML = logsContent;
        
        // Прокручиваем до последней записи
        scannerLogsContent.scrollTop = scannerLogsContent.scrollHeight;
    } catch (error) {
        console.error('Ошибка при обновлении логов сканера:', error);
        scannerLogsContent.textContent = 'Ошибка при загрузке логов сканера.';
    }
}

// Форматирование времени работы
function formatUptime(ms) {
    if (!ms) return '00:00:00';
    
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Показать индикатор загрузки
function showLoading(message = 'Загрузка...') {
    loadingMessage.textContent = message;
    loadingIndicator.classList.remove('d-none');
}

// Скрыть индикатор загрузки
function hideLoading() {
    loadingIndicator.classList.add('d-none');
}

// Отображение уведомления
function showNotification(title, message) {
  try {
    notificationTitle.textContent = title;
    notificationBody.textContent = message;
    notificationModal.show();
  } catch (error) {
    console.error('Ошибка при отображении уведомления:', error);
    alert(`${title}: ${message}`);
  }
}

// Инициализация логов и расширенных индикаторов
function initLoggingAndIndicators() {
  // Инициализация подсказок
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Обработчик обновления логов
  document.getElementById('refreshLogsBtn').addEventListener('click', function() {
    fetchLogs();
  });
  
  // Обработчик для показа влияния изменения параметров в реальном времени
  document.querySelectorAll('input[type="range"], input[type="number"], select, input[type="checkbox"]').forEach(function(input) {
    input.addEventListener('change', function() {
      updateStrategyPreview(this);
    });
    
    // Для ползунков также слушаем событие input для обновления в реальном времени
    if (input.type === 'range') {
      input.addEventListener('input', function() {
        updateStrategyPreview(this);
      });
    }
  });
  
  // Показываем настройки соответствующей стратегии
  document.getElementById('strategySelect').addEventListener('change', function() {
    toggleStrategySettings();
  });
  
  // Сразу активируем текущую стратегию
  toggleStrategySettings();
  
  // Обработчик для уровня агрессивности стратегии
  document.getElementById('strategyAggressivenessRange').addEventListener('input', function() {
    updateAggressivenessPresets(this.value);
  });
  
  // Настройка предустановок для Scalping режима
  document.getElementById('scalpingModeSelect').addEventListener('change', function() {
    applyScalpingModePreset(this.value);
  });
  
  // Настройка предустановок для DCA режима
  document.getElementById('dcaStrategySelect').addEventListener('change', function() {
    applyDCAModePreset(this.value);
  });
  
  // Сохранение расширенных настроек индикаторов
  const originalSaveAdvancedSettings = document.getElementById('saveAdvancedSettingsBtn').onclick;
  document.getElementById('saveAdvancedSettingsBtn').onclick = function() {
    saveIndicatorSettings();
    if (originalSaveAdvancedSettings) {
      originalSaveAdvancedSettings.call(this);
    }
  };
  
  // Начальная загрузка логов
  fetchLogs();
  
  // Запускаем интервал обновления логов и индикаторов
  setInterval(fetchLogs, 15000); // Обновление каждые 15 секунд
}

// Переключение настроек стратегии
function toggleStrategySettings() {
  const strategy = document.getElementById('strategySelect').value;
  
  // Скрываем/показываем соответствующие блоки настроек
  if (strategy === 'SCALPING') {
    document.getElementById('scalpingSettings').style.display = 'block';
    document.getElementById('dcaSettings').style.display = 'none';
  } else if (strategy === 'DCA') {
    document.getElementById('scalpingSettings').style.display = 'none';
    document.getElementById('dcaSettings').style.display = 'block';
  }
}

// Обновление предпросмотра влияния настроек
function updateStrategyPreview(inputElement) {
  const id = inputElement.id;
  let previewText = '';
  let tooltipText = '';
  
  // Логика определения влияния параметра
  switch(id) {
    case 'tpInput':
      const tpValue = parseFloat(inputElement.value);
      if (tpValue > 0.5) {
        previewText = `Установлено высокое значение ${tpValue}%. Ожидайте меньше сделок, но потенциально большую прибыль.`;
      } else if (tpValue < 0.2) {
        previewText = `Установлено низкое значение ${tpValue}%. Ожидайте больше сделок с небольшой прибылью.`;
      } else {
        previewText = `Установлено сбалансированное значение ${tpValue}%.`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
      
    case 'slInput':
      const slValue = parseFloat(inputElement.value);
      if (slValue > 0.3) {
        previewText = `Установлено высокое значение ${slValue}%. Больший риск на сделку, но меньше преждевременных закрытий.`;
      } else if (slValue < 0.15) {
        previewText = `Установлено низкое значение ${slValue}%. Меньший риск на сделку, но возможны частые закрытия.`;
      } else {
        previewText = `Установлено сбалансированное значение ${slValue}%.`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
      
    case 'leverageInput':
      const leverageValue = parseInt(inputElement.value);
      if (leverageValue > 10) {
        previewText = `Внимание! Высокое плечо ${leverageValue}x увеличивает как потенциальную прибыль, так и риск.`;
      } else if (leverageValue < 5) {
        previewText = `Консервативное плечо ${leverageValue}x. Меньший риск, но и меньшая прибыль.`;
      } else {
        previewText = `Сбалансированное плечо ${leverageValue}x.`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
      
    case 'positionSizeInput':
      const positionValue = parseInt(inputElement.value);
      if (positionValue > 40) {
        previewText = `Внимание! Большой размер позиции ${positionValue}% увеличивает риск.`;
      } else if (positionValue < 20) {
        previewText = `Консервативный размер позиции ${positionValue}%. Меньший риск, но и меньшая прибыль.`;
      } else {
        previewText = `Сбалансированный размер позиции ${positionValue}%.`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
      
    case 'reinvestmentInput':
      const reinvestValue = parseInt(inputElement.value);
      if (reinvestValue > 90) {
        previewText = `Агрессивное реинвестирование ${reinvestValue}%. Максимальный рост капитала, но выше риск.`;
      } else if (reinvestValue < 50) {
        previewText = `Консервативное реинвестирование ${reinvestValue}%. Медленный рост, но надежное сохранение прибыли.`;
      } else {
        previewText = `Сбалансированное реинвестирование ${reinvestValue}%.`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
      
    case 'rsiPeriodInput':
      const rsiPeriod = parseInt(inputElement.value);
      if (rsiPeriod < 10) {
        previewText = `RSI с коротким периодом ${rsiPeriod}. Больше сигналов, но выше шум.`;
      } else if (rsiPeriod > 20) {
        previewText = `RSI с длинным периодом ${rsiPeriod}. Меньше сигналов, но более надежные.`;
      } else {
        previewText = `Стандартный период RSI ${rsiPeriod}.`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
      
    case 'rsiOverboughtInput':
    case 'rsiOversoldInput':
      const rsiOB = parseInt(document.getElementById('rsiOverboughtInput').value);
      const rsiOS = parseInt(document.getElementById('rsiOversoldInput').value);
      if (rsiOB - rsiOS < 30) {
        previewText = `Узкий диапазон RSI (${rsiOS}-${rsiOB}). Много сигналов, выше риск ложных.`;
      } else if (rsiOB - rsiOS > 50) {
        previewText = `Широкий диапазон RSI (${rsiOS}-${rsiOB}). Меньше сигналов, но более надежные.`;
      } else {
        previewText = `Стандартный диапазон RSI (${rsiOS}-${rsiOB}).`;
      }
      displayParameterEffect(inputElement, previewText);
      break;
    
    // Другие параметры...
  }
  
  // Обновим таблицу сравнения если бот запущен
  if (statusIndicator.classList.contains('active')) {
    fetchComparisonData();
  }
}

// Отображение эффекта изменения параметра
function displayParameterEffect(inputElement, text) {
  // Находим или создаем элемент для отображения информации
  let infoElement = inputElement.parentElement.querySelector('.strategy-info');
  if (!infoElement) {
    infoElement = document.createElement('div');
    infoElement.className = 'strategy-info';
    
    // Если есть родительский элемент input-group, добавляем после него
    const inputGroup = inputElement.closest('.input-group') || inputElement;
    if (inputGroup.nextElementSibling) {
      inputGroup.parentElement.insertBefore(infoElement, inputGroup.nextElementSibling);
    } else {
      inputGroup.parentElement.appendChild(infoElement);
    }
  }
  
  // Устанавливаем текст
  infoElement.textContent = text;
  
  // Добавляем временное выделение для привлечения внимания
  infoElement.style.backgroundColor = '#f0f8ff';
  setTimeout(() => {
    infoElement.style.backgroundColor = 'transparent';
  }, 500);
}

// Функция для обновления пресетов в зависимости от уровня агрессивности
function updateAggressivenessPresets(level) {
  level = parseInt(level);
  
  // Адаптируем настройки в зависимости от уровня агрессивности
  const strategy = document.getElementById('strategySelect').value;
  
  if (strategy === 'SCALPING') {
    // Настройки для Scalping стратегии
    switch(level) {
      case 1: // Очень консервативный
        document.getElementById('tpInput').value = 0.4;
        document.getElementById('slInput').value = 0.15;
        document.getElementById('leverageInput').value = 5;
        document.getElementById('positionSizeInput').value = 20;
        document.getElementById('rsiOverboughtInput').value = 75;
        document.getElementById('rsiOversoldInput').value = 25;
        document.getElementById('adxMinValueInput').value = 25;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
      case 2: // Консервативный
        document.getElementById('tpInput').value = 0.35;
        document.getElementById('slInput').value = 0.18;
        document.getElementById('leverageInput').value = 7;
        document.getElementById('positionSizeInput').value = 25;
        document.getElementById('rsiOverboughtInput').value = 72;
        document.getElementById('rsiOversoldInput').value = 28;
        document.getElementById('adxMinValueInput').value = 22;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
      case 3: // Нейтральный
        document.getElementById('tpInput').value = 0.3;
        document.getElementById('slInput').value = 0.2;
        document.getElementById('leverageInput').value = 8;
        document.getElementById('positionSizeInput').value = 30;
        document.getElementById('rsiOverboughtInput').value = 70;
        document.getElementById('rsiOversoldInput').value = 30;
        document.getElementById('adxMinValueInput').value = 20;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
      case 4: // Агрессивный
        document.getElementById('tpInput').value = 0.25;
        document.getElementById('slInput').value = 0.22;
        document.getElementById('leverageInput').value = 10;
        document.getElementById('positionSizeInput').value = 35;
        document.getElementById('rsiOverboughtInput').value = 68;
        document.getElementById('rsiOversoldInput').value = 32;
        document.getElementById('adxMinValueInput').value = 18;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
      case 5: // Очень агрессивный
        document.getElementById('tpInput').value = 0.2;
        document.getElementById('slInput').value = 0.25;
        document.getElementById('leverageInput').value = 12;
        document.getElementById('positionSizeInput').value = 40;
        document.getElementById('rsiOverboughtInput').value = 65;
        document.getElementById('rsiOversoldInput').value = 35;
        document.getElementById('adxMinValueInput').value = 15;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
    }
  } else if (strategy === 'DCA') {
    // Настройки для DCA стратегии
    switch(level) {
      case 1: // Очень консервативный
        document.getElementById('dcaMaxOrdersInput').value = 2;
        document.getElementById('tpInput').value = 0.5;
        document.getElementById('slInput').value = 0.4;
        document.getElementById('leverageInput').value = 3;
        document.getElementById('positionSizeInput').value = 15;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
      case 5: // Очень агрессивный
        document.getElementById('dcaMaxOrdersInput').value = 5;
        document.getElementById('tpInput').value = 0.3;
        document.getElementById('slInput').value = 0.6;
        document.getElementById('leverageInput').value = 10;
        document.getElementById('positionSizeInput').value = 30;
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
      default: // Промежуточные уровни
        // Настройки пропорционально между консервативными и агрессивными
        document.getElementById('dcaMaxOrdersInput').value = Math.min(Math.round(level), 5);
        document.getElementById('tpInput').value = (0.5 - ((level - 1) * 0.05)).toFixed(2);
        document.getElementById('slInput').value = (0.4 + ((level - 1) * 0.05)).toFixed(2);
        document.getElementById('leverageInput').value = 3 + ((level - 1) * 1.75);
        document.getElementById('positionSizeInput').value = 15 + ((level - 1) * 3.75);
        updateStrategyPreview(document.getElementById('tpInput'));
        break;
    }
  }
}

// Применение предустановок для режима Scalping
function applyScalpingModePreset(mode) {
  switch(mode) {
    case 'standard':
      document.getElementById('tpInput').value = 0.3;
      document.getElementById('slInput').value = 0.2;
      document.getElementById('tsActivationInput').value = 0.15;
      document.getElementById('tsDistanceInput').value = 0.1;
      document.getElementById('maxDurationInput').value = 5;
      document.getElementById('rsiPeriodInput').value = 14;
      document.getElementById('adxMinValueInput').value = 20;
      document.getElementById('volumeMinInput').value = 0.5;
      updateStrategyPreview(document.getElementById('tpInput'));
      addLogEntry('Применен стандартный режим скальпинга', 'trading');
      break;
    case 'ultra':
      document.getElementById('tpInput').value = 0.25;
      document.getElementById('slInput').value = 0.15;
      document.getElementById('tsActivationInput').value = 0.12;
      document.getElementById('tsDistanceInput').value = 0.08;
      document.getElementById('maxDurationInput').value = 3;
      document.getElementById('rsiPeriodInput').value = 10;
      document.getElementById('adxMinValueInput').value = 15;
      document.getElementById('volumeMinInput').value = 0.7;
      updateStrategyPreview(document.getElementById('tpInput'));
      addLogEntry('Применен режим ультра-скальпинга. Повышенная частота сделок, пониженная прибыль на сделку.', 'trading');
      break;
    case 'safe':
      document.getElementById('tpInput').value = 0.4;
      document.getElementById('slInput').value = 0.2;
      document.getElementById('tsActivationInput').value = 0.2;
      document.getElementById('tsDistanceInput').value = 0.15;
      document.getElementById('maxDurationInput').value = 8;
      document.getElementById('rsiPeriodInput').value = 18;
      document.getElementById('adxMinValueInput').value = 25;
      document.getElementById('volumeMinInput').value = 0.8;
      updateStrategyPreview(document.getElementById('tpInput'));
      addLogEntry('Применен безопасный режим скальпинга. Пониженная частота сделок, более строгие фильтры.', 'trading');
      break;
  }
}

// Применение предустановок для режима DCA
function applyDCAModePreset(mode) {
  switch(mode) {
    case 'standard':
      document.getElementById('dcaMaxOrdersInput').value = 3;
      document.getElementById('tpInput').value = 0.4;
      document.getElementById('slInput').value = 0.5;
      document.getElementById('maxDurationInput').value = 15;
      updateStrategyPreview(document.getElementById('tpInput'));
      addLogEntry('Применен стандартный режим DCA', 'trading');
      break;
    case 'aggressive':
      document.getElementById('dcaMaxOrdersInput').value = 5;
      document.getElementById('tpInput').value = 0.3;
      document.getElementById('slInput').value = 0.7;
      document.getElementById('maxDurationInput').value = 30;
      updateStrategyPreview(document.getElementById('tpInput'));
      addLogEntry('Применен агрессивный режим DCA. Большее количество усреднений, повышенный риск.', 'trading');
      break;
    case 'safe':
      document.getElementById('dcaMaxOrdersInput').value = 2;
      document.getElementById('tpInput').value = 0.5;
      document.getElementById('slInput').value = 0.3;
      document.getElementById('maxDurationInput').value = 10;
      updateStrategyPreview(document.getElementById('tpInput'));
      addLogEntry('Применен безопасный режим DCA. Минимальное количество усреднений, более низкий риск.', 'trading');
      break;
  }
}

// Получение логов с сервера
function fetchLogs() {
  // Если бот не запущен, не делаем запрос
  if (!statusIndicator.classList.contains('active')) {
    document.getElementById('tradingLogsContent').textContent = 'Бот не запущен. Логи недоступны.';
    document.getElementById('indicatorsLogsContent').textContent = 'Бот не запущен. Логи недоступны.';
    document.getElementById('comparisonTableBody').innerHTML = '<tr><td colspan="4" class="text-center">Бот не запущен</td></tr>';
    return;
  }
  
  // Запрос логов бота
  fetch('/api/bot/logs')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateLogs(data.logs);
      } else {
        console.error('Ошибка при получении логов:', data.message);
      }
    })
    .catch(error => {
      console.error('Ошибка при получении логов:', error);
      document.getElementById('tradingLogsContent').textContent = 'Ошибка при получении логов. Проверьте консоль сервера.';
    });
  
  // Запрос данных для сравнения индикаторов
  fetchComparisonData();
}

// Обновление логов
function updateLogs(logs) {
  const tradingLogsElement = document.getElementById('tradingLogsContent');
  const indicatorsLogsElement = document.getElementById('indicatorsLogsContent');
  
  if (!logs || logs.length === 0) {
    tradingLogsElement.textContent = 'Логи недоступны или пусты.';
    indicatorsLogsElement.textContent = 'Логи недоступны или пусты.';
    return;
  }
  
  // Фильтруем логи по категориям
  const tradingLogs = logs.filter(log => log.category === 'trading' || log.category === 'system');
  const indicatorLogs = logs.filter(log => log.category === 'indicators');
  
  // Форматируем логи торговли
  let tradingLogsContent = '';
  tradingLogs.forEach(log => {
    const timeString = new Date(log.timestamp).toLocaleTimeString();
    let logClass = '';
    
    if (log.level === 'error') logClass = 'error';
    else if (log.level === 'warning') logClass = 'warning';
    else if (log.level === 'success') logClass = 'success';
    
    tradingLogsContent += `<div class="log-entry ${logClass}">` +
      `<span class="timestamp">[${timeString}]</span> ${log.message}</div>`;
  });
  
  // Форматируем логи индикаторов
  let indicatorsLogsContent = '';
  indicatorLogs.forEach(log => {
    const timeString = new Date(log.timestamp).toLocaleTimeString();
    let logClass = '';
    
    if (log.level === 'error') logClass = 'error';
    else if (log.level === 'warning') logClass = 'warning';
    else if (log.level === 'success') logClass = 'success';
    
    indicatorsLogsContent += `<div class="log-entry ${logClass}">` +
      `<span class="timestamp">[${timeString}]</span> ${log.message}</div>`;
  });
  
  // Обновляем содержимое
  tradingLogsElement.innerHTML = tradingLogsContent || 'Торговых логов нет.';
  indicatorsLogsElement.innerHTML = indicatorsLogsContent || 'Логов индикаторов нет.';
  
  // Прокручиваем до последней записи
  tradingLogsElement.scrollTop = tradingLogsElement.scrollHeight;
  indicatorsLogsElement.scrollTop = indicatorsLogsElement.scrollHeight;
}

// Добавление записи в локальные логи (для обновления без перезагрузки с сервера)
function addLogEntry(message, category = 'trading', level = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let logElement;
  
  if (category === 'trading') {
    logElement = document.getElementById('tradingLogsContent');
  } else if (category === 'indicators') {
    logElement = document.getElementById('indicatorsLogsContent');
  } else {
    return;
  }
  
  // Определяем класс в зависимости от уровня
  let logClass = '';
  if (level === 'error') logClass = 'error';
  else if (level === 'warning') logClass = 'warning';
  else if (level === 'success') logClass = 'success';
  
  // Добавляем новую запись
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${logClass}`;
  logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
  
  // Добавляем в соответствующий лог
  logElement.appendChild(logEntry);
  
  // Прокручиваем вниз
  logElement.scrollTop = logElement.scrollHeight;
}

// Получение данных для сравнения индикаторов
function fetchComparisonData() {
  fetch('/api/bot/indicators/comparison')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateComparisonTable(data.comparison);
      } else {
        console.error('Ошибка при получении данных сравнения:', data.message);
      }
    })
    .catch(error => {
      console.error('Ошибка при получении данных сравнения:', error);
    });
}

// Обновление таблицы сравнения индикаторов
function updateComparisonTable(comparisonData) {
  const tableBody = document.getElementById('comparisonTableBody');
  
  if (!comparisonData || Object.keys(comparisonData).length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Нет данных для сравнения</td></tr>';
    return;
  }
  
  let tableContent = '';
  
  // Обработка RSI
  if (comparisonData.rsi) {
    const rsiValue = comparisonData.rsi.value.toFixed(2);
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Нейтрально';
    
    if (comparisonData.rsi.status === 'buy') {
      statusClass = 'indicator-status-ok';
      statusText = 'Покупка ✓';
    } else if (comparisonData.rsi.status === 'sell') {
      statusClass = 'indicator-status-ok';
      statusText = 'Продажа ✓';
    } else if (comparisonData.rsi.status === 'not_ready') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'Не готов ✗';
    }
    
    tableContent += `
      <tr>
        <td>RSI</td>
        <td>${rsiValue} (${comparisonData.rsi.message})</td>
        <td>Перекупленность: ${comparisonData.rsi.overbought}, Перепроданность: ${comparisonData.rsi.oversold}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }
  
  // Обработка EMA
  if (comparisonData.ema) {
    const fastEma = comparisonData.ema.fast.toFixed(2);
    const slowEma = comparisonData.ema.slow.toFixed(2);
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Нейтрально';
    
    if (comparisonData.ema.status === 'buy') {
      statusClass = 'indicator-status-ok';
      statusText = 'Покупка ✓';
    } else if (comparisonData.ema.status === 'sell') {
      statusClass = 'indicator-status-ok';
      statusText = 'Продажа ✓';
    } else if (comparisonData.ema.status === 'not_ready') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'Не готов ✗';
    }
    
    tableContent += `
      <tr>
        <td>EMA</td>
        <td>Быстрая: ${fastEma}, Медленная: ${slowEma}</td>
        <td>${comparisonData.ema.message}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }
  
  // Обработка Bollinger Bands
  if (comparisonData.bb) {
    const upperBand = comparisonData.bb.upper.toFixed(2);
    const middleBand = comparisonData.bb.middle.toFixed(2);
    const lowerBand = comparisonData.bb.lower.toFixed(2);
    const currentPrice = comparisonData.bb.price.toFixed(2);
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Нейтрально';
    
    if (comparisonData.bb.status === 'buy') {
      statusClass = 'indicator-status-ok';
      statusText = 'Покупка ✓';
    } else if (comparisonData.bb.status === 'sell') {
      statusClass = 'indicator-status-ok';
      statusText = 'Продажа ✓';
    } else if (comparisonData.bb.status === 'not_ready') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'Не готов ✗';
    }
    
    tableContent += `
      <tr>
        <td>Bollinger Bands</td>
        <td>Цена: ${currentPrice}</td>
        <td>Верхняя: ${upperBand}, Средняя: ${middleBand}, Нижняя: ${lowerBand}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }
  
  // Обработка ADX
  if (comparisonData.adx) {
    const adxValue = comparisonData.adx.value.toFixed(2);
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Нейтрально';
    
    if (comparisonData.adx.status === 'ok') {
      statusClass = 'indicator-status-ok';
      statusText = 'Готов ✓';
    } else if (comparisonData.adx.status === 'not_ok') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'Не готов ✗';
    }
    
    tableContent += `
      <tr>
        <td>ADX (сила тренда)</td>
        <td>${adxValue}</td>
        <td>Минимум: ${comparisonData.adx.minValue}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }
  
  // Обработка объема
  if (comparisonData.volume) {
    const volumeValue = comparisonData.volume.current.toFixed(2);
    const avgVolume = comparisonData.volume.average.toFixed(2);
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Нейтрально';
    
    if (comparisonData.volume.status === 'ok') {
      statusClass = 'indicator-status-ok';
      statusText = 'Готов ✓';
    } else if (comparisonData.volume.status === 'not_ok') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'Не готов ✗';
    }
    
    tableContent += `
      <tr>
        <td>Объем торгов</td>
        <td>${volumeValue}</td>
        <td>Средний объем: ${avgVolume}, Минимум: ${(avgVolume * comparisonData.volume.minDeviation).toFixed(2)}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }
  
  // Итоговый сигнал
  if (comparisonData.finalSignal) {
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Ожидание';
    
    if (comparisonData.finalSignal.status === 'buy') {
      statusClass = 'indicator-status-ok';
      statusText = 'ПОКУПКА ✓';
    } else if (comparisonData.finalSignal.status === 'sell') {
      statusClass = 'indicator-status-ok';
      statusText = 'ПРОДАЖА ✓';
    } else if (comparisonData.finalSignal.status === 'not_ready') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'НЕ ГОТОВ ✗';
    }
    
    tableContent += `
      <tr class="table-active">
        <td><strong>ИТОГОВЫЙ СИГНАЛ</strong></td>
        <td colspan="2">${comparisonData.finalSignal.message}</td>
        <td class="${statusClass}"><strong>${statusText}</strong></td>
      </tr>
    `;
  }
  
  tableBody.innerHTML = tableContent;
}

// Сохранение расширенных настроек индикаторов
function saveIndicatorSettings() {
  const indicatorSettings = {
    rsi: {
      enabled: document.getElementById('rsiEnabledCheck').checked,
      period: parseInt(document.getElementById('rsiPeriodInput').value),
      overbought: parseInt(document.getElementById('rsiOverboughtInput').value),
      oversold: parseInt(document.getElementById('rsiOversoldInput').value)
    },
    ema: {
      enabled: document.getElementById('emaEnabledCheck').checked,
      fastPeriod: parseInt(document.getElementById('emaFastInput').value),
      mediumPeriod: parseInt(document.getElementById('emaMediumInput').value),
      slowPeriod: parseInt(document.getElementById('emaSlowInput').value)
    },
    bollingerBands: {
      enabled: document.getElementById('bbEnabledCheck').checked,
      period: parseInt(document.getElementById('bbPeriodInput').value),
      deviation: parseFloat(document.getElementById('bbDeviationInput').value),
      strategy: document.getElementById('bbStrategySelect').value
    },
    filters: {
      adx: {
        enabled: document.getElementById('adxEnabledCheck').checked,
        minValue: parseInt(document.getElementById('adxMinValueInput').value)
      },
      volume: {
        enabled: document.getElementById('volumeEnabledCheck').checked,
        minimumVolume: parseFloat(document.getElementById('volumeMinInput').value)
      },
      indicatorsCombination: document.getElementById('indicatorsCombinationSelect').value
    }
  };
  
  // Добавляем настройки в обычный запрос сохранения
  const advancedSettings = {
    takeProfitPercentage: parseFloat(document.getElementById('tpInput').value),
    stopLossPercentage: parseFloat(document.getElementById('slInput').value),
    maxTradeDurationMinutes: parseInt(document.getElementById('maxDurationInput').value),
    trailingStop: {
      enabled: document.getElementById('trailingStopCheck').checked,
      activationPercentage: parseFloat(document.getElementById('tsActivationInput').value),
      stopDistance: parseFloat(document.getElementById('tsDistanceInput').value)
    },
    riskManagement: {
      dailyLossLimit: parseInt(document.getElementById('dailyLossLimitInput').value),
      maxOpenPositions: parseInt(document.getElementById('maxPositionsInput').value)
    },
    dca: {
      maxOrders: parseInt(document.getElementById('dcaMaxOrdersInput').value)
    },
    entries: indicatorSettings
  };
  
  // Добавляем запись в лог
  addLogEntry('Сохранение расширенных настроек индикаторов...', 'indicators');
  
  // Отправляем на сервер
  fetch('/api/bot/config/indicators', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ indicators: indicatorSettings, advancedSettings: advancedSettings })
  })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        addLogEntry('Настройки индикаторов успешно сохранены!', 'indicators', 'success');
      } else {
        addLogEntry(`Ошибка при сохранении настроек: ${result.message}`, 'indicators', 'error');
      }
    })
    .catch(error => {
      console.error('Ошибка при сохранении настроек индикаторов:', error);
      addLogEntry(`Ошибка при сохранении настроек: ${error.message}`, 'indicators', 'error');
    });
}

// Дополнительная обработка для socket.io событий от сервера
socket.on('log_update', (logData) => {
  addLogEntry(logData.message, logData.category, logData.level);
});

socket.on('indicator_update', (indicatorData) => {
  updateComparisonTable(indicatorData);
});

// Обработка Socket.IO событий для менеджера ботов
socket.on('manager_status_update', (status) => {
  updateManagerStatus(status);
});

socket.on('manager_log', (logEntry) => {
  // Добавляем запись в логи менеджера
  const logElement = document.getElementById('managerLogsContent');
  const timeString = new Date(logEntry.timestamp).toLocaleTimeString();
  let logClass = '';
  
  if (logEntry.level === 'error') logClass = 'error';
  else if (logEntry.level === 'warning') logClass = 'warning';
  else if (logEntry.level === 'success') logClass = 'success';
  
  const logHtml = `<div class="log-entry ${logClass}">` +
    `<span class="timestamp">[${timeString}]</span> ${logEntry.message}</div>`;
  
  // Добавляем в начало, чтобы новые логи были сверху
  if (logElement.innerHTML === 'Ожидание логов менеджера...') {
    logElement.innerHTML = logHtml;
  } else {
    logElement.innerHTML = logHtml + logElement.innerHTML;
  }
});

socket.on('scanner_log', (logEntry) => {
  // Добавляем запись в логи сканера
  const logElement = document.getElementById('scannerLogsContent');
  const timeString = new Date(logEntry.timestamp).toLocaleTimeString();
  let logClass = '';
  
  if (logEntry.level === 'error') logClass = 'error';
  else if (logEntry.level === 'warning') logClass = 'warning';
  else if (logEntry.level === 'success') logClass = 'success';
  
  const logHtml = `<div class="log-entry ${logClass}">` +
    `<span class="timestamp">[${timeString}]</span> ${logEntry.message}</div>`;
  
  // Добавляем в начало, чтобы новые логи были сверху
  if (logElement.innerHTML === 'Ожидание логов сканера...') {
    logElement.innerHTML = logHtml;
  } else {
    logElement.innerHTML = logHtml + logElement.innerHTML;
  }
});

socket.on('pairs_updated', (pairs) => {
  if (pairs && pairs.length > 0) {
    managerPairs = pairs;
    updatePairsTable(pairs);
    filteredPairsCount.textContent = pairs.length;
  }
});

// Обработка Socket.IO событий
socket.on('bot_update', (status) => {
  try {
    // Проверяем, это обновление от менеджера ботов или от одиночного бота
    if (status.botId) {
      // Обновление от менеджера ботов
      if (managerBots[status.botId]) {
        managerBots[status.botId].botStatus = status.status;
        updateBotsTable(managerBots);
      }
    } else {
      // Обновление от одиночного бота
      updateBotStatus(status);
    }
  } catch (error) {
    console.error('Ошибка при обработке обновления от сервера:', error);
  }
});

// Обработка ошибок Socket.IO
socket.on('connect_error', (error) => {
  console.error('Socket.IO ошибка соединения:', error);
});

socket.on('error', (error) => {
  console.error('Socket.IO ошибка:', error);
});

// Обновляем время работы бота каждую секунду, если бот запущен
setInterval(() => {
  try {
    if (statusIndicator.classList.contains('active')) {
      const timeParts = uptimeText.textContent.split(':');
      let hours = parseInt(timeParts[0]);
      let minutes = parseInt(timeParts[1]);
      let seconds = parseInt(timeParts[2]);
      
      seconds++;
      
      if (seconds >= 60) {
        seconds = 0;
        minutes++;
        
        if (minutes >= 60) {
          minutes = 0;
          hours++;
        }
      }
      
      uptimeText.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Ошибка при обновлении времени работы:', error);
  }
}, 1000);