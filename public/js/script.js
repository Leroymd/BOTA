// public/js/script.js - Клиентский JavaScript для веб-интерфейса

// Инициализация Socket.IO
const socket = io();

// Элементы интерфейса
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const managerStatusIndicator = document.getElementById('managerStatusIndicator');
const managerStatusText = document.getElementById('managerStatusText');
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

// Дополнительные элементы для мультибота
const multiBotTab = document.getElementById('multibot-tab');
const multiBotContent = document.getElementById('multibot-content');
const initializeManagerBtn = document.getElementById('initializeManagerBtn');
const startManagerBtn = document.getElementById('startManagerBtn');
const stopManagerBtn = document.getElementById('stopManagerBtn');
const botCountInput = document.getElementById('botCountInput');
const addBotsBtn = document.getElementById('addBotsBtn');
const activePairsContainer = document.getElementById('activePairsContainer');
const forceScanBtn = document.getElementById('forceScanBtn');
const analyzeSymbolInput = document.getElementById('analyzeSymbolInput');
const analyzePairBtn = document.getElementById('analyzePairBtn');
const botInstancesTable = document.getElementById('botInstancesTable');
const scannerLogsContent = document.getElementById('scannerLogsContent');
const managerLogsContent = document.getElementById('managerLogsContent');

// Элементы формы
const strategySelect = document.getElementById('strategySelect');
const symbolSelect = document.getElementById('symbolSelect');
const leverageInput = document.getElementById('leverageInput');
const positionSizeInput = document.getElementById('positionSizeInput');
const reinvestmentInput = document.getElementById('reinvestmentInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiSecretInput = document.getElementById('apiSecretInput');
const apiPassphraseInput = document.getElementById('apiPassphraseInput');
const demoModeCheck = document.getElementById('demoModeCheck');
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
const partialCloseCheck = document.getElementById('partialCloseCheck');
const partialClose1Input = document.getElementById('partialClose1Input');
const partialCloseAmount1Input = document.getElementById('partialCloseAmount1Input');
const partialClose2Input = document.getElementById('partialClose2Input');
const partialCloseAmount2Input = document.getElementById('partialCloseAmount2Input');
const indicatorsAsRecommendationRadio = document.getElementById('indicatorsAsRecommendationRadio');
const indicatorsAsRequirementRadio = document.getElementById('indicatorsAsRequirementRadio');
const confidenceThresholdRange = document.getElementById('confidenceThresholdRange');
const confidenceThresholdValue = document.getElementById('confidenceThresholdValue');

// Модальное окно для частичного закрытия
const partialCloseModal = new bootstrap.Modal(document.getElementById('partialCloseModal'));
const partialClosePositionId = document.getElementById('partialClosePositionId');
const partialClosePercentageRange = document.getElementById('partialClosePercentageRange');
const partialClosePercentageValue = document.getElementById('partialClosePercentageValue');
const confirmPartialCloseBtn = document.getElementById('confirmPartialCloseBtn');

// Модальное окно для результатов анализа пары
const pairAnalysisModal = new bootstrap.Modal(document.getElementById('pairAnalysisModal'));
const pairAnalysisTitle = document.getElementById('pairAnalysisTitle');
const pairAnalysisBody = document.getElementById('pairAnalysisBody');

// Кнопки сохранения настроек
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveApiBtn = document.getElementById('saveApiBtn');
const saveAdvancedSettingsBtn = document.getElementById('saveAdvancedSettingsBtn');

// Модальное окно для уведомлений
const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
const notificationTitle = document.getElementById('notificationTitle');
const notificationBody = document.getElementById('notificationBody');

// График баланса
let balanceChart;
let balanceData = [];
let timeData = [];

// Статус менеджера
let managerInitialized = false;
let managerRunning = false;

// Получение конфигурации бота при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Инициализация графика
    initBalanceChart();
    
    // Получение настроек бота
    await fetchBotConfig();
    
    // Получение статуса бота
    await fetchBotStatus();
    
    // Получение статуса менеджера ботов
    await fetchManagerStatus();
    
    // Привязка обработчиков событий
    attachEventListeners();
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
    demoModeCheck.checked = config.demo === true;
    
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
    
    // Настройки частичного закрытия
    if (config.partialClose) {
      partialCloseCheck.checked = config.partialClose.enabled;
      partialClose1Input.value = config.partialClose.level1 || 0.15;
      partialCloseAmount1Input.value = config.partialClose.amount1 || 30;
      partialClose2Input.value = config.partialClose.level2 || 0.25;
      partialCloseAmount2Input.value = config.partialClose.amount2 || 50;
    }
    
    // Настройки индикаторов (условие или рекомендация)
    if (config.indicatorsAsRequirement !== undefined) {
      if (config.indicatorsAsRequirement) {
        indicatorsAsRequirementRadio.checked = true;
      } else {
        indicatorsAsRecommendationRadio.checked = true;
      }
    }
    
    if (config.confidenceThreshold) {
      confidenceThresholdRange.value = config.confidenceThreshold;
      confidenceThresholdValue.textContent = `${config.confidenceThreshold}%`;
    }
    
    // Настройки индикаторов
    if (config.entries && config.entries.rsi) {
      document.getElementById('rsiEnabledCheck').checked = config.entries.rsi.enabled;
      document.getElementById('rsiPeriodInput').value = config.entries.rsi.period || 14;
      document.getElementById('rsiOverboughtInput').value = config.entries.rsi.overbought || 70;
      document.getElementById('rsiOversoldInput').value = config.entries.rsi.oversold || 30;
    }
    
    if (config.entries && config.entries.ema) {
      document.getElementById('emaEnabledCheck').checked = config.entries.ema.enabled;
      document.getElementById('emaFastInput').value = config.entries.ema.fastPeriod || 20;
      document.getElementById('emaMediumInput').value = config.entries.ema.mediumPeriod || 50;
      document.getElementById('emaSlowInput').value = config.entries.ema.slowPeriod || 100;
    }
    
    if (config.entries && config.entries.bollingerBands) {
      document.getElementById('bbEnabledCheck').checked = config.entries.bollingerBands.enabled;
      document.getElementById('bbPeriodInput').value = config.entries.bollingerBands.period || 20;
      document.getElementById('bbDeviationInput').value = config.entries.bollingerBands.deviation || 2;
      document.getElementById('bbStrategySelect').value = config.entries.bollingerBands.strategy || 'bounce';
    }
    
    if (config.filters) {
      if (config.filters.adx) {
        document.getElementById('adxEnabledCheck').checked = config.filters.adx.enabled;
        document.getElementById('adxMinValueInput').value = config.filters.adx.minValue || 15;
      }
      
      if (config.filters.volume) {
        document.getElementById('volumeEnabledCheck').checked = config.filters.volume.enabled;
        document.getElementById('volumeMinInput').value = config.filters.volume.minimumVolume || 0.5;
      }
      
      document.getElementById('indicatorsCombinationSelect').value = config.filters.indicatorsCombination || 'all';
    }
    
    // Отображение нужных настроек стратегии
    toggleStrategySettings();
    
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

// Получение статуса менеджера ботов
async function fetchManagerStatus() {
  try {
    const response = await fetch('/api/manager/status');
    const statusData = await response.json();
    
    updateManagerStatus(statusData);
    
    // Если менеджер инициализирован, получаем информацию о парах и ботах
    if (statusData.status !== 'not_initialized') {
      managerInitialized = true;
      
      if (statusData.status === 'running') {
        managerRunning = true;
      }
      
      // Получаем инфомацию о парах
      await fetchPairsInfo();
      
      // Получаем логи менеджера
      await fetchManagerLogs();
      
      // Получаем логи сканера
      await fetchScannerLogs();
    }
    
    return statusData;
  } catch (error) {
    console.error('Ошибка при получении статуса менеджера:', error);
    // Не показываем уведомление, так как менеджер может быть не настроен
    return { status: 'not_initialized' };
  }
}

// Обновление статуса менеджера ботов
function updateManagerStatus(status) {
  try {
    // Обновляем индикатор статуса
    if (status.status === 'running') {
      managerStatusIndicator.classList.add('active');
      managerStatusText.textContent = 'Менеджер: Активен';
      
      // Обновляем состояние кнопок
      initializeManagerBtn.disabled = true;
      startManagerBtn.disabled = true;
      stopManagerBtn.disabled = false;
      addBotsBtn.disabled = false;
      forceScanBtn.disabled = false;
      analyzePairBtn.disabled = false;
      
      managerRunning = true;
    } else if (status.status === 'initialized') {
      managerStatusIndicator.classList.remove('active');
      managerStatusText.textContent = 'Менеджер: Инициализирован';
      
      // Обновляем состояние кнопок
      initializeManagerBtn.disabled = true;
      startManagerBtn.disabled = false;
      stopManagerBtn.disabled = true;
      addBotsBtn.disabled = true;
      forceScanBtn.disabled = false;
      analyzePairBtn.disabled = false;
      
      managerInitialized = true;
      managerRunning = false;
    } else {
      managerStatusIndicator.classList.remove('active');
      managerStatusText.textContent = 'Менеджер: Не активен';
      
      // Обновляем состояние кнопок
      initializeManagerBtn.disabled = false;
      startManagerBtn.disabled = true;
      stopManagerBtn.disabled = true;
      addBotsBtn.disabled = true;
      forceScanBtn.disabled = true;
      analyzePairBtn.disabled = true;
      
      managerInitialized = false;
      managerRunning = false;
    }
    
    // Обновляем информацию о ботах
    if (status.bots && status.bots.length > 0) {
      updateBotInstancesTable(status.bots);
    }
  } catch (error) {
    console.error('Ошибка при обновлении статуса менеджера:', error);
  }
}

// Обновление таблицы экземпляров ботов
function updateBotInstancesTable(bots) {
  try {
    if (!bots || bots.length === 0) {
      botInstancesTable.innerHTML = '<tr><td colspan="6" class="text-center">Нет активных ботов</td></tr>';
      return;
    }
    
    let html = '';
    
    bots.forEach(bot => {
      let statusClass = '';
      let statusIcon = '';
      
      if (bot.status === 'running') {
        statusClass = 'text-success';
        statusIcon = '<i class="bi bi-play-circle-fill"></i>';
      } else if (bot.status === 'stopped') {
        statusClass = 'text-danger';
        statusIcon = '<i class="bi bi-stop-circle-fill"></i>';
      } else {
        statusClass = 'text-warning';
        statusIcon = '<i class="bi bi-exclamation-circle-fill"></i>';
      }
      
      const pnlClass = bot.currentPnl >= 0 ? 'text-success' : 'text-danger';
      const pnlIcon = bot.currentPnl >= 0 ? '<i class="bi bi-arrow-up"></i>' : '<i class="bi bi-arrow-down"></i>';
      
      html += `
        <tr>
          <td>${bot.id}</td>
          <td>${bot.symbol}</td>
          <td class="${statusClass}">${statusIcon} ${bot.status}</td>
          <td>${bot.balance ? bot.balance.toFixed(2) : '0.00'} USDT</td>
          <td class="${pnlClass}">${pnlIcon} ${bot.currentPnl ? bot.currentPnl.toFixed(2) : '0.00'}%</td>
          <td>${bot.openPositions ? bot.openPositions.length : 0}</td>
          <td>
            <div class="btn-group btn-group-sm">
              ${bot.status === 'running' 
                ? `<button class="btn btn-danger stop-bot-btn" data-bot-id="${bot.id}"><i class="bi bi-stop-fill"></i> Стоп</button>` 
                : `<button class="btn btn-success start-bot-btn" data-bot-id="${bot.id}"><i class="bi bi-play-fill"></i> Старт</button>`}
              <button class="btn btn-warning restart-bot-btn" data-bot-id="${bot.id}"><i class="bi bi-arrow-repeat"></i> Рестарт</button>
            </div>
          </td>
        </tr>
      `;
    });
    
    botInstancesTable.innerHTML = html;
    
    // Добавляем обработчики для кнопок управления ботами
    document.querySelectorAll('.stop-bot-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const botId = e.currentTarget.dataset.botId;
        if (confirm(`Вы уверены, что хотите остановить бота ${botId}?`)) {
          await stopBot(botId);
        }
      });
    });
    
    document.querySelectorAll('.start-bot-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const botId = e.currentTarget.dataset.botId;
        await startBot(botId);
      });
    });
    
    document.querySelectorAll('.restart-bot-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const botId = e.currentTarget.dataset.botId;
        if (confirm(`Вы уверены, что хотите перезапустить бота ${botId}?`)) {
          await restartBot(botId);
        }
      });
    });
  } catch (error) {
    console.error('Ошибка при обновлении таблицы ботов:', error);
    botInstancesTable.innerHTML = '<tr><td colspan="6" class="text-center">Ошибка при загрузке данных о ботах</td></tr>';
  }
}

// Получение информации о парах
async function fetchPairsInfo() {
  try {
    if (!managerInitialized) return;
    
    const response = await fetch('/api/manager/pairs');
    const pairsInfo = await response.json();
    
    // Обновляем отображение пар
    updatePairsDisplay(pairsInfo);
    
    return pairsInfo;
  } catch (error) {
    console.error('Ошибка при получении информации о парах:', error);
    return [];
  }
}

// Обновление отображения пар
function updatePairsDisplay(pairsInfo) {
  try {
    if (!activePairsContainer) return;
    
    if (!pairsInfo || pairsInfo.length === 0) {
      activePairsContainer.innerHTML = '<div class="alert alert-info">Нет активных торговых пар. Запустите сканирование, чтобы найти подходящие пары.</div>';
      return;
    }
    
    let html = '<div class="row">';
    
    pairsInfo.forEach(pair => {
      // Определяем цвет на основе оценки пары
      let scoreClass = 'bg-secondary';
      if (pair.score >= 80) {
        scoreClass = 'bg-success';
      } else if (pair.score >= 60) {
        scoreClass = 'bg-primary';
      } else if (pair.score >= 40) {
        scoreClass = 'bg-warning';
      } else if (pair.score >= 20) {
        scoreClass = 'bg-danger';
      }
      
      // Формируем строку для отображения
      html += `
        <div class="col-md-4 mb-3">
          <div class="card">
            <div class="card-header ${scoreClass} text-white">
              <strong>${pair.symbol}</strong> 
              <span class="float-end">Оценка: ${pair.score}%</span>
            </div>
            <div class="card-body p-2">
              <div class="d-flex justify-content-between mb-1">
                <span>Цена:</span>
                <span>${pair.price.toFixed(4)} USDT</span>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span>Объем (24ч):</span>
                <span>${formatNumber(pair.volume)} USDT</span>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span>Волатильность:</span>
                <span>${pair.volatility.toFixed(2)}%</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Тренд:</span>
                <span class="${pair.trend === 'UP' ? 'text-success' : (pair.trend === 'DOWN' ? 'text-danger' : 'text-secondary')}">
                  ${pair.trend === 'UP' ? '<i class="bi bi-arrow-up-circle-fill"></i> Восходящий' : 
                    (pair.trend === 'DOWN' ? '<i class="bi bi-arrow-down-circle-fill"></i> Нисходящий' : 
                    '<i class="bi bi-dash-circle-fill"></i> Нейтральный')}
                </span>
              </div>
              <div class="mt-2">
                <button class="btn btn-sm btn-outline-primary analyze-pair-btn" data-symbol="${pair.symbol}">
                  <i class="bi bi-search"></i> Анализировать
                </button>
                <button class="btn btn-sm btn-outline-success use-pair-btn" data-symbol="${pair.symbol}">
                  <i class="bi bi-plus-circle"></i> Использовать
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    activePairsContainer.innerHTML = html;
    
    // Добавляем обработчики для кнопок
    document.querySelectorAll('.analyze-pair-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const symbol = e.currentTarget.dataset.symbol;
        await analyzePair(symbol);
      });
    });
    
    document.querySelectorAll('.use-pair-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = e.currentTarget.dataset.symbol;
        symbolSelect.value = symbol;
        
        // Переключаемся на вкладку настроек
        document.querySelector('#nav-tab button[data-bs-target="#nav-settings"]').click();
        
        // Прокручиваем к выбору символа
        symbolSelect.scrollIntoView({ behavior: 'smooth' });
        
        // Подсвечиваем выбор символа
        symbolSelect.classList.add('highlight-pulse');
        setTimeout(() => {
          symbolSelect.classList.remove('highlight-pulse');
        }, 1500);
      });
    });
  } catch (error) {
    console.error('Ошибка при обновлении отображения пар:', error);
    if (activePairsContainer) {
      activePairsContainer.innerHTML = '<div class="alert alert-danger">Ошибка при отображении торговых пар</div>';
    }
  }
}

// Форматирование чисел для отображения
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  } else {
    return num.toFixed(2);
  }
}

// Получение логов менеджера
async function fetchManagerLogs() {
  try {
    if (!managerInitialized || !managerLogsContent) return;
    
    const response = await fetch('/api/manager/logs');
    const data = await response.json();
    
    if (data.success && data.logs && data.logs.length > 0) {
      updateManagerLogs(data.logs);
    }
  } catch (error) {
    console.error('Ошибка при получении логов менеджера:', error);
    if (managerLogsContent) {
      managerLogsContent.textContent = 'Ошибка при получении логов менеджера';
    }
  }
}

// Обновление логов менеджера
function updateManagerLogs(logs) {
  try {
    if (!managerLogsContent) return;
    
    let html = '';
    
    logs.forEach(log => {
      const timeString = new Date(log.timestamp).toLocaleTimeString();
      let logClass = '';
      
      if (log.level === 'error') logClass = 'error';
      else if (log.level === 'warning') logClass = 'warning';
      else if (log.level === 'success') logClass = 'success';
      
      html += `<div class="log-entry ${logClass}">` +
        `<span class="timestamp">[${timeString}]</span> ${log.message}</div>`;
    });
    
    managerLogsContent.innerHTML = html || 'Нет логов менеджера';
    
    // Прокручиваем до последней записи
    managerLogsContent.scrollTop = managerLogsContent.scrollHeight;
  } catch (error) {
    console.error('Ошибка при обновлении логов менеджера:', error);
    if (managerLogsContent) {
      managerLogsContent.textContent = 'Ошибка при обновлении логов менеджера';
    }
  }
}

// Получение логов сканера
async function fetchScannerLogs() {
  try {
    if (!managerInitialized || !scannerLogsContent) return;
    
    const response = await fetch('/api/manager/scanner-logs');
    const data = await response.json();
    
    if (data.success && data.logs && data.logs.length > 0) {
      updateScannerLogs(data.logs);
    }
  } catch (error) {
    console.error('Ошибка при получении логов сканера:', error);
    if (scannerLogsContent) {
      scannerLogsContent.textContent = 'Ошибка при получении логов сканера';
    }
  }
}

// Обновление логов сканера
function updateScannerLogs(logs) {
  try {
    if (!scannerLogsContent) return;
    
    let html = '';
    
    logs.forEach(log => {
      const timeString = new Date(log.timestamp).toLocaleTimeString();
      let logClass = '';
      
      if (log.level === 'error') logClass = 'error';
      else if (log.level === 'warning') logClass = 'warning';
      else if (log.level === 'success') logClass = 'success';
      
      html += `<div class="log-entry ${logClass}">` +
        `<span class="timestamp">[${timeString}]</span> ${log.message}</div>`;
    });
    
    scannerLogsContent.innerHTML = html || 'Нет логов сканера';
    
    // Прокручиваем до последней записи
    scannerLogsContent.scrollTop = scannerLogsContent.scrollHeight;
  } catch (error) {
    console.error('Ошибка при обновлении логов сканера:', error);
    if (scannerLogsContent) {
      scannerLogsContent.textContent = 'Ошибка при обновлении логов сканера';
    }
  }
}

// Анализ пары
async function analyzePair(symbol) {
  try {
    if (!managerInitialized) {
      showNotification('Ошибка', 'Менеджер ботов не инициализирован');
      return;
    }
    
    // Показываем модальное окно с индикатором загрузки
    pairAnalysisTitle.textContent = `Анализ пары ${symbol}`;
    pairAnalysisBody.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-3">Выполняется анализ пары...</p></div>';
    pairAnalysisModal.show();
    
    // Выполняем запрос на анализ пары
    const response = await fetch('/api/manager/analyze-pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ symbol })
    });
    
    const result = await response.json();
    
    // Обновляем содержимое модального окна с результатами анализа
    if (result.success) {
      const data = result.result;
      
      // Формируем HTML для отображения результатов анализа
      let html = `
        <div class="row">
          <div class="col-md-6">
            <h5>Основная информация</h5>
            <table class="table table-sm">
              <tr>
                <td>Символ:</td>
                <td><strong>${data.symbol}</strong></td>
              </tr>
              <tr>
                <td>Текущая цена:</td>
                <td>${data.price.toFixed(6)} USDT</td>
              </tr>
              <tr>
                <td>Оценка:</td>
                <td><strong class="${data.score >= 70 ? 'text-success' : (data.score >= 50 ? 'text-primary' : 'text-danger')}">${data.score}%</strong></td>
              </tr>
              <tr>
                <td>Рекомендация:</td>
                <td><strong class="${data.recommendation === 'BUY' ? 'text-success' : (data.recommendation === 'SELL' ? 'text-danger' : 'text-secondary')}">${data.recommendation}</strong></td>
              </tr>
              <tr>
                <td>Тренд:</td>
                <td class="${data.trend === 'UP' ? 'text-success' : (data.trend === 'DOWN' ? 'text-danger' : 'text-secondary')}">
                  ${data.trend === 'UP' ? '<i class="bi bi-arrow-up-circle-fill"></i> Восходящий' : 
                    (data.trend === 'DOWN' ? '<i class="bi bi-arrow-down-circle-fill"></i> Нисходящий' : 
                    '<i class="bi bi-dash-circle-fill"></i> Нейтральный')}
                </td>
              </tr>
              <tr>
                <td>Волатильность:</td>
                <td>${data.volatility.toFixed(2)}%</td>
              </tr>
              <tr>
                <td>Суточный объем:</td>
                <td>${formatNumber(data.volume)} USDT</td>
              </tr>
            </table>
          </div>
          <div class="col-md-6">
            <h5>Индикаторы</h5>
            <table class="table table-sm">
      `;
      
      // Добавляем данные индикаторов
      if (data.indicators) {
        for (const [key, value] of Object.entries(data.indicators)) {
          let statusClass = '';
          let statusText = '';
          
          if (typeof value === 'object' && value.status) {
            statusClass = value.status === 'buy' ? 'text-success' : 
                        (value.status === 'sell' ? 'text-danger' : 'text-secondary');
            statusText = value.status.toUpperCase();
          } else {
            statusClass = 'text-secondary';
            statusText = 'N/A';
          }
          
          html += `
            <tr>
              <td>${key.toUpperCase()}:</td>
              <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
          `;
        }
      }
      
      html += `
            </table>
          </div>
        </div>
        ${data.message ? `<div class="alert alert-info mt-3">${data.message}</div>` : ''}
        <div class="mt-3 text-center">
          <button class="btn btn-success use-analyzed-pair-btn" data-symbol="${data.symbol}">
            <i class="bi bi-plus-circle"></i> Использовать эту пару
          </button>
        </div>
      `;
      
      pairAnalysisBody.innerHTML = html;
      
      // Добавляем обработчик для кнопки использования пары
      document.querySelector('.use-analyzed-pair-btn').addEventListener('click', () => {
        symbolSelect.value = data.symbol;
        pairAnalysisModal.hide();
        
        // Переключаемся на вкладку настроек
        document.querySelector('#nav-tab button[data-bs-target="#nav-settings"]').click();
        
        // Прокручиваем к выбору символа
        symbolSelect.scrollIntoView({ behavior: 'smooth' });
        
        // Подсвечиваем выбор символа
        symbolSelect.classList.add('highlight-pulse');
        setTimeout(() => {
          symbolSelect.classList.remove('highlight-pulse');
        }, 1500);
      });
    } else {
      pairAnalysisBody.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill"></i> ${result.message || 'Не удалось выполнить анализ пары'}
        </div>
      `;
    }
  } catch (error) {
    console.error('Ошибка при анализе пары:', error);
    pairAnalysisBody.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill"></i> Произошла ошибка при анализе пары
      </div>
    `;
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
      
      // Фактор прибыли
      profitFactorText.textContent = status.stats.profitFactor ? status.stats.profitFactor.toFixed(2) : '0.00';
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
      
      if (status.indicators.ema !== undefined) {
        emaText.textContent = `${status.indicators.ema.fast.toFixed(2)} / ${status.indicators.ema.slow.toFixed(2)}`;
        
        // Показываем стрелки для EMA
        if (status.indicators.ema.fast > status.indicators.ema.slow) {
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
      openPositionsTable.innerHTML = '<tr><td colspan="6" class="text-center">Нет открытых позиций</td></tr>';
      return;
    }
    
    let html = '';
    
    positions.forEach(position => {
      const pnlClass = position.currentPnl >= 0 ? 'text-success' : 'text-danger';
      const positionTypeClass = position.type === 'LONG' ? 'position-long' : 'position-short';
      const confidenceLevel = position.confidenceLevel || 0;
      const confidenceClass = confidenceLevel >= 80 ? 'text-success' : 
                            confidenceLevel >= 60 ? 'text-primary' : 'text-secondary';
      
      html += `
          <tr>
              <td class="${positionTypeClass}">${position.type}</td>
              <td>${position.entryPrice.toFixed(4)}</td>
              <td>${position.size.toFixed(2)}</td>
              <td class="${pnlClass}">${position.currentPnl ? position.currentPnl.toFixed(2) : '0.00'}%</td>
              <td class="${confidenceClass}">${confidenceLevel}%</td>
              <td>
                  <div class="btn-group btn-group-sm">
                      <button class="btn btn-danger close-position-btn" data-position-id="${position.id}">
                          <i class="bi bi-x-circle"></i> Закрыть
                      </button>
                      <button class="btn btn-outline-secondary partial-close-btn" data-position-id="${position.id}">
                          <i class="bi bi-scissors"></i> Частично
                      </button>
                  </div>
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
          try {
            const response = await fetch(`/api/bot/position/${positionId}/close`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ percentage: 100 })
            });
            
            const result = await response.json();
            
            if (result.success) {
              showNotification('Успех', 'Позиция успешно закрыта');
            } else {
              showNotification('Ошибка', `Не удалось закрыть позицию: ${result.message}`);
            }
          } catch (error) {
            console.error('Ошибка при закрытии позиции:', error);
            showNotification('Ошибка', 'Произошла ошибка при закрытии позиции');
          }
        }
      });
    });
    
    // Добавляем обработчики для кнопок частичного закрытия
    document.querySelectorAll('.partial-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const positionId = e.currentTarget.dataset.positionId;
        partialClosePositionId.value = positionId;
        partialClosePercentageRange.value = 50;
        partialClosePercentageValue.textContent = '50%';
        partialCloseModal.show();
      });
    });
  } catch (error) {
    console.error('Ошибка при обновлении таблицы позиций:', error);
    openPositionsTable.innerHTML = '<tr><td colspan="6" class="text-center">Ошибка загрузки позиций</td></tr>';
  }
}

// Обновление таблицы последних сделок
function updateLastTradesTable(trades) {
  try {
    if (!trades || trades.length === 0) {
      lastTradesTable.innerHTML = '<tr><td colspan="6" class="text-center">Нет данных о сделках</td></tr>';
      return;
    }
    
    let html = '';
    
    trades.forEach(trade => {
      const resultClass = trade.result === 'win' ? 'trade-win' : (trade.result === 'loss' ? 'trade-loss' : '');
      const positionTypeClass = trade.type === 'LONG' ? 'position-long' : 'position-short';
      const confidenceLevel = trade.confidenceLevel || 0;
      const confidenceClass = confidenceLevel >= 80 ? 'text-success' : 
                            confidenceLevel >= 60 ? 'text-primary' : 'text-secondary';
      
      html += `
          <tr>
              <td class="${positionTypeClass}">${trade.type}</td>
              <td>${trade.entryPrice.toFixed(4)}</td>
              <td>${trade.closePrice ? trade.closePrice.toFixed(4) : '-'}</td>
              <td class="${resultClass}">${trade.pnl ? trade.pnl.toFixed(2) : '0.00'}%</td>
              <td class="${confidenceClass}">${confidenceLevel}%</td>
              <td class="${resultClass}">${trade.result ? trade.result.toUpperCase() : 'OPEN'}</td>
          </tr>
      `;
    });
    
    lastTradesTable.innerHTML = html;
  } catch (error) {
    console.error('Ошибка при обновлении таблицы сделок:', error);
    lastTradesTable.innerHTML = '<tr><td colspan="6" class="text-center">Ошибка загрузки сделок</td></tr>';
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
    
    // Инициализация менеджера ботов
    initializeManagerBtn.addEventListener('click', async () => {
      try {
        // Проверяем, заполнены ли API ключи
        if (!apiKeyInput.value || !apiSecretInput.value || !apiPassphraseInput.value) {
          showNotification('Ошибка', 'Необходимо заполнить API ключи BitGet для инициализации менеджера');
          return;
        }
        
        // Отправляем запрос на инициализацию менеджера
        const response = await fetch('/api/manager/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', 'Менеджер ботов успешно инициализирован');
          await fetchManagerStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось инициализировать менеджер: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при инициализации менеджера:', error);
        showNotification('Ошибка', 'Произошла ошибка при инициализации менеджера');
      }
    });
    
    // Запуск менеджера ботов
    startManagerBtn.addEventListener('click', async () => {
      try {
        const botCount = parseInt(botCountInput.value) || 1;
        
        if (botCount < 1 || botCount > 5) {
          showNotification('Ошибка', 'Количество ботов должно быть от 1 до 5');
          return;
        }
        
        // Отправляем запрос на запуск менеджера
        const response = await fetch('/api/manager/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ botCount })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', `Менеджер ботов успешно запущен с ${botCount} ботами`);
          await fetchManagerStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось запустить менеджер: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при запуске менеджера:', error);
        showNotification('Ошибка', 'Произошла ошибка при запуске менеджера');
      }
    });
    
    // Остановка менеджера ботов
    stopManagerBtn.addEventListener('click', async () => {
      try {
        if (confirm('Вы уверены, что хотите остановить менеджер ботов? Это остановит все активные боты.')) {
          // Отправляем запрос на остановку менеджера
          const response = await fetch('/api/manager/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const result = await response.json();
          
          if (result.success) {
            showNotification('Успех', 'Менеджер ботов успешно остановлен');
            await fetchManagerStatus(); // Обновляем статус
          } else {
            showNotification('Ошибка', `Не удалось остановить менеджер: ${result.message}`);
          }
        }
      } catch (error) {
        console.error('Ошибка при остановке менеджера:', error);
        showNotification('Ошибка', 'Произошла ошибка при остановке менеджера');
      }
    });
    
    // Добавление ботов
    addBotsBtn.addEventListener('click', async () => {
      try {
        const botCount = parseInt(botCountInput.value) || 1;
        
        if (botCount < 1) {
          showNotification('Ошибка', 'Количество ботов должно быть положительным числом');
          return;
        }
        
        // Отправляем запрос на добавление ботов
        const response = await fetch('/api/manager/add-bots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ botCount })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', `Добавлено ${result.bots.length} ботов`);
          await fetchManagerStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось добавить ботов: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при добавлении ботов:', error);
        showNotification('Ошибка', 'Произошла ошибка при добавлении ботов');
      }
    });
    
    // Принудительное сканирование пар
    forceScanBtn.addEventListener('click', async () => {
      try {
        // Меняем текст кнопки на индикатор загрузки
        const originalText = forceScanBtn.innerHTML;
        forceScanBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Сканирование...';
        forceScanBtn.disabled = true;
        
        // Отправляем запрос на запуск сканирования
        const response = await fetch('/api/manager/force-scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', `Сканирование завершено, найдено ${result.pairs.length} пар`);
          // Обновляем информацию о парах
          await fetchPairsInfo();
          // Обновляем логи сканера
          await fetchScannerLogs();
        } else {
          showNotification('Ошибка', `Не удалось выполнить сканирование: ${result.message}`);
        }
        
        // Восстанавливаем состояние кнопки
        forceScanBtn.innerHTML = originalText;
        forceScanBtn.disabled = false;
      } catch (error) {
        console.error('Ошибка при выполнении сканирования:', error);
        showNotification('Ошибка', 'Произошла ошибка при выполнении сканирования');
        
        // Восстанавливаем состояние кнопки
        forceScanBtn.innerHTML = '<i class="bi bi-search"></i> Сканировать пары';
        forceScanBtn.disabled = false;
      }
    });
    
    // Анализ конкретной пары
    analyzePairBtn.addEventListener('click', async () => {
      try {
        const symbol = analyzeSymbolInput.value.trim().toUpperCase();
        
        if (!symbol) {
          showNotification('Ошибка', 'Необходимо указать символ пары для анализа');
          return;
        }
        
        await analyzePair(symbol);
      } catch (error) {
        console.error('Ошибка при анализе пары:', error);
        showNotification('Ошибка', 'Произошла ошибка при анализе пары');
      }
    });
    
    // Остановка конкретного бота
    async function stopBot(botId) {
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
          await fetchManagerStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось остановить бота: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при остановке бота:', error);
        showNotification('Ошибка', 'Произошла ошибка при остановке бота');
      }
    }
    
    // Запуск конкретного бота
    async function startBot(botId) {
      try {
        const response = await fetch(`/api/manager/start-bot/${botId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', `Бот ${botId} успешно запущен`);
          await fetchManagerStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось запустить бота: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        showNotification('Ошибка', 'Произошла ошибка при запуске бота');
      }
    }
    
    // Перезапуск конкретного бота
    async function restartBot(botId) {
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
          await fetchManagerStatus(); // Обновляем статус
        } else {
          showNotification('Ошибка', `Не удалось перезапустить бота: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при перезапуске бота:', error);
        showNotification('Ошибка', 'Произошла ошибка при перезапуске бота');
      }
    }
    
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
        const apiSettings = {
          demo: demoModeCheck.checked
        };
        
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
          },
          partialClose: {
            enabled: partialCloseCheck.checked,
            level1: parseFloat(partialClose1Input.value),
            amount1: parseInt(partialCloseAmount1Input.value),
            level2: parseFloat(partialClose2Input.value),
            amount2: parseInt(partialCloseAmount2Input.value)
          },
          indicatorsAsRequirement: indicatorsAsRequirementRadio.checked,
          confidenceThreshold: parseInt(confidenceThresholdRange.value),
          entries: {
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
            }
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
    
    // Обработчик для подтверждения частичного закрытия
    confirmPartialCloseBtn.addEventListener('click', async () => {
      try {
        const positionId = partialClosePositionId.value;
        const percentage = parseInt(partialClosePercentageRange.value);
        
        if (!positionId || !percentage) {
          showNotification('Ошибка', 'Не удалось получить данные о позиции или проценте закрытия');
          return;
        }
        
        const response = await fetch(`/api/bot/position/${positionId}/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ percentage })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Успех', `Успешно закрыто ${percentage}% позиции`);
          partialCloseModal.hide();
        } else {
          showNotification('Ошибка', `Не удалось частично закрыть позицию: ${result.message}`);
        }
      } catch (error) {
        console.error('Ошибка при частичном закрытии позиции:', error);
        showNotification('Ошибка', 'Произошла ошибка при частичном закрытии позиции');
      }
    });
    
    // Обновление отображаемого значения для порога уверенности
    confidenceThresholdRange.addEventListener('input', () => {
      confidenceThresholdValue.textContent = `${confidenceThresholdRange.value}%`;
    });

    // Обновление отображаемого значения для порога частичного закрытия
    partialClosePercentageRange.addEventListener('input', () => {
      partialClosePercentageValue.textContent = `${partialClosePercentageRange.value}%`;
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
    
    // Переключение режима стратегии
    strategySelect.addEventListener('change', toggleStrategySettings);
    
    // Обновление логов
    document.getElementById('refreshLogsBtn').addEventListener('click', fetchLogs);
    
    // Инициализируем элементы всплывающих подсказок
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Начальная загрузка логов
    fetchLogs();
    
    // Запускаем интервал обновления логов и индикаторов
    setInterval(fetchLogs, 15000); // Обновление каждые 15 секунд
    
    // Обновление логов сканера и менеджера каждую минуту
    setInterval(() => {
      if (managerInitialized) {
        fetchManagerLogs();
        fetchScannerLogs();
        fetchPairsInfo();
      }
    }, 60000);
  } catch (error) {
    console.error('Ошибка при настройке обработчиков событий:', error);
  }
}

// Переключение настроек стратегии
function toggleStrategySettings() {
  const strategy = strategySelect.value;
  
  // Скрываем/показываем соответствующие блоки настроек
  if (strategy === 'SCALPING') {
    document.getElementById('scalpingSettings').style.display = 'block';
    document.getElementById('dcaSettings').style.display = 'none';
  } else if (strategy === 'DCA') {
    document.getElementById('scalpingSettings').style.display = 'none';
    document.getElementById('dcaSettings').style.display = 'block';
  }
}

// Получение логов с сервера
function fetchLogs() {
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
  
  // Обработка PAC
  if (comparisonData.pac) {
    const upperPac = comparisonData.pac.upper.toFixed(2);
    const centerPac = comparisonData.pac.center.toFixed(2);
    const lowerPac = comparisonData.pac.lower.toFixed(2);
    const currentPrice = comparisonData.pac.price.toFixed(2);
    let statusClass = 'indicator-status-neutral';
    let statusText = 'Нейтрально';
    
    if (comparisonData.pac.status === 'buy' || comparisonData.pac.status === 'buy_weak') {
      statusClass = 'indicator-status-ok';
      statusText = 'Покупка ✓';
    } else if (comparisonData.pac.status === 'sell' || comparisonData.pac.status === 'sell_weak') {
      statusClass = 'indicator-status-ok';
      statusText = 'Продажа ✓';
    } else if (comparisonData.pac.status === 'not_ready') {
      statusClass = 'indicator-status-not-ok';
      statusText = 'Не готов ✗';
    }
    
    // Если обнаружен pullback, выделяем это
    if (comparisonData.pac.pullbackDetected) {
      statusClass = 'indicator-status-ok';
      statusText = comparisonData.pac.status === 'buy' ? 'PULLBACK UP ✓✓' : 'PULLBACK DOWN ✓✓';
    }
    
    tableContent += `
      <tr>
        <td>Price Action Channel</td>
        <td>Цена: ${currentPrice}</td>
        <td>Верхняя: ${upperPac}, Центр: ${centerPac}, Нижняя: ${lowerPac}</td>
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
        <td>Уверенность: LONG ${comparisonData.finalSignal.longScore.toFixed(1)}%, SHORT ${comparisonData.finalSignal.shortScore.toFixed(1)}%</td>
        <td>${comparisonData.finalSignal.message}</td>
        <td class="${statusClass}"><strong>${statusText}</strong></td>
      </tr>
    `;
  }
  
  tableBody.innerHTML = tableContent;
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

// Обработка Socket.IO событий для одиночного бота
socket.on('bot_update', (status) => {
  try {
    updateBotStatus(status);
  } catch (error) {
    console.error('Ошибка при обработке обновления от сервера:', error);
  }
});

// Обработка Socket.IO событий для менеджера ботов
socket.on('manager_status_update', (status) => {
  try {
    updateManagerStatus(status);
  } catch (error) {
    console.error('Ошибка при обработке обновления от менеджера:', error);
  }
});

socket.on('pairs_updated', (pairs) => {
  try {
    updatePairsDisplay(pairs);
  } catch (error) {
    console.error('Ошибка при обработке обновления списка пар:', error);
  }
});

socket.on('manager_log', (logEntry) => {
  try {
    // Обновляем логи менеджера
    fetchManagerLogs();
  } catch (error) {
    console.error('Ошибка при обработке лога менеджера:', error);
  }
});

socket.on('scanner_log', (logEntry) => {
  try {
    // Обновляем логи сканера
    fetchScannerLogs();
  } catch (error) {
    console.error('Ошибка при обработке лога сканера:', error);
  }
});

// Обработка ошибок Socket.IO
socket.on('connect_error', (error) => {
  console.error('Socket.IO ошибка соединения:', error);
});

socket.on('error', (error) => {
  console.error('Socket.IO ошибка:', error);
});

// Обработчик события обновления логов
socket.on('log_update', (logEntry) => {
  // Получаем текущие логи
  fetch('/api/bot/logs')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateLogs(data.logs);
      }
    })
    .catch(error => {
      console.error('Ошибка при получении логов после события:', error);
    });
});

// Обработчик события обновления индикаторов
socket.on('indicator_update', (indicatorData) => {
  updateComparisonTable(indicatorData);
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
