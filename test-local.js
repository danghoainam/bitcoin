const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = '8744827165:AAE05TLhOcSw5Xekrbh0eVByyuEDzppThcM';
const CHAT_ID = '-5297079278';
const bot = new TelegramBot(TELEGRAM_TOKEN);

function calculateRSI(closes) {
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function test() {
  console.log("🚀 Đang phân tích kỹ thuật từng đồng coin...");
  
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const fgRes = await axios.get('https://api.alternative.me/fng/');
    const sentiment = parseInt(fgRes.data.data[0].value);

    const analysisData = await Promise.all(symbols.map(async (s) => {
      const [ticker, kline] = await Promise.all([
        axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`),
        axios.get(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=1h&limit=15`)
      ]);
      
      const closes = kline.data.map(k => parseFloat(k[4]));
      const rsi = calculateRSI(closes);
      
      let trend = "⚖️ SIDEWAYS";
      let advice = "WAIT";
      let bullish = true;

      // Logic: Kết hợp tâm lý chung + RSI riêng của từng con
      if (sentiment < 40 && rsi < 40) {
        trend = "🚀 BULLISH";
        advice = "LONG";
        bullish = true;
      } else if (sentiment > 60 && rsi > 60) {
        trend = "⚠️ BEARISH";
        advice = "SHORT";
        bullish = false;
      }

      const price = parseFloat(ticker.data.lastPrice);
      const tp1 = bullish ? price * 1.02 : price * 0.98;
      const tp2 = bullish ? price * 1.05 : price * 0.95;
      const sl = bullish ? price * 0.97 : price * 1.03;

      return {
        symbol: s.replace('USDT', ''),
        price: price.toLocaleString(),
        change: ticker.data.priceChangePercent,
        rsi: rsi.toFixed(2),
        trend,
        advice,
        tp1: tp1.toLocaleString(),
        tp2: tp2.toLocaleString(),
        sl: sl.toLocaleString()
      };
    }));

    const message = `
🎯 **DỰ BÁO RIÊNG BIỆT TỪNG COIN** 🎯
----------------------------------
🧠 Tâm lý thị trường: \`${sentiment}/100\`

${analysisData.map(d => `
**${d.symbol}** | RSI: \`${d.rsi}\`
💰 Giá: \`$${d.price}\` (${d.change}%)
📈 Xu hướng: **${d.trend}** (${d.advice})
🎯 TP: \`$${d.tp1}\` | \`$${d.tp2}\`
❌ SL: \`$${d.sl}\`
`).join('')}
----------------------------------
    `;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log("🎉 THÀNH CÔNG: Bản tin dự báo riêng biệt đã được gửi!");
  } catch (error) {
    console.error("❌ LỖI:", error.message);
  }
}

test();
