// config.js - Файл конфигурации
const fs = require('fs');
const path = require('path');

const config = {
  server: {
    port: 3000
  },
  bitget: {
    apiUrl: "https://api.bitget.com",
    wsUrl: "wss://ws.bitget.com/spot/v1/stream",
    apiKey: "bg_bff08721949c2aef87294000b6f114df",
    secretKey: "8082e6f32b795a5a6a69f13f4d2a4b646fb6a28cc8a52668073031aa6ca30068",
    passphrase: "Workinday13",
    demo: false
  },
  bot: {
    symbol: "XRPUSDT",
    strategy: "SCALPING",
    initialDeposit: 100,
    leverage: 5,
    positionSize: 5,
    takeProfitPercentage: 0.25,
    stopLossPercentage: 0.15,
    trailingStop: {
      enabled: true,
      activationPercentage: 0.12,
      stopDistance: 0.08
    },
    maxTradeDurationMinutes: 3,
    timeframes: [
      "1m"
    ],
    riskManagement: {
      dailyLossLimit: 10,
      maxOpenPositions: 1
    },
    entries: {
      rsi: {
        enabled: false,
        period: 5,
        overbought: 60,
        oversold: 40
      },
      ema: {
        enabled: false,
        fastPeriod: 5,
        mediumPeriod: 30,
        slowPeriod: 50
      },
      bollingerBands: {
        enabled: false,
        period: 10,
        deviation: 1,
        strategy: "squeeze"
      }
    },
    filters: {
      adx: {
        enabled: true,
        minValue: 10
      },
      volume: {
        enabled: true,
        minimumVolume: 0.2
      },
      indicatorsCombination: "any"
    },
    dca: {
      maxOrders: 3,
      priceStep: 1.5,
      multiplier: 1.5
    },
    logLevel: "info",
    reinvestment: 90,
    partialClose: {
      enabled: true,
      level1: 0.15,
      amount1: 30,
      level2: 0.25,
      amount2: 50
    },
    indicatorsAsRequirement: false,
    confidenceThreshold: 50
  },
  logging: {
    level: "info",
    saveToFile: true,
    logDir: "./logs"
  }
};

// Функция для сохранения конфигурации в файл
config.saveConfig = function(updatedConfig) {
    try {
      console.log('Сохранение конфигурации...');
      
      // Рекурсивное объединение объектов с учетом вложенных структур
      function deepMerge(target, source) {
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
        return target;
      }
      
      // Объединяем обновленную конфигурацию с текущей
      deepMerge(config, updatedConfig);
      
      // Обеспечиваем, что вложенные объекты сохраняются правильно
      if (updatedConfig.bot) {
        if (updatedConfig.bot.entries) {
          config.bot.entries = deepMerge(config.bot.entries || {}, updatedConfig.bot.entries);
        }
        if (updatedConfig.bot.filters) {
          config.bot.filters = deepMerge(config.bot.filters || {}, updatedConfig.bot.filters);
        }
        if (updatedConfig.bot.trailingStop) {
          config.bot.trailingStop = deepMerge(config.bot.trailingStop || {}, updatedConfig.bot.trailingStop);
        }
        if (updatedConfig.bot.riskManagement) {
          config.bot.riskManagement = deepMerge(config.bot.riskManagement || {}, updatedConfig.bot.riskManagement);
        }
        if (updatedConfig.bot.dca) {
          config.bot.dca = deepMerge(config.bot.dca || {}, updatedConfig.bot.dca);
        }
      }
      
      // Создаем строку с содержимым конфигурационного файла
      // Используем функцию, которая преобразует кавычки для ключей объекта для лучшей читаемости
      const formatObjectKeys = (jsonStr) => {
        return jsonStr.replace(/"([^"]+)":/g, '$1:');
      };
      
      // Временно сохраняем функции
      const saveConfigFunc = config.saveConfig;
      
      // Удаляем функции для правильной сериализации
      delete config.saveConfig;
      
      const configContent = `// config.js - Файл конфигурации
const fs = require('fs');
const path = require('path');

const config = ${formatObjectKeys(JSON.stringify(config, null, 2))};

// Функция для сохранения конфигурации в файл
config.saveConfig = ${saveConfigFunc.toString()};

module.exports = config;`;
      
      // Восстанавливаем функции
      config.saveConfig = saveConfigFunc;
      
      // Сохраняем в файл
      fs.writeFileSync(path.join(__dirname, 'config.js'), configContent);
      console.log('Конфигурация успешно сохранена');
      
      return true;
    } catch (error) {
      console.error('Ошибка при сохранении конфигурации:', error);
      return false;
    }
  };

module.exports = config;