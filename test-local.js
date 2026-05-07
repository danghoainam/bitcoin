import axios from 'axios';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8744827165:AAE05TLhOcSw5Xekrbh0eVByyuEDzppThcM';
const CHAT_ID = process.env.CHAT_ID || '-5297079278';

function calculateRSI(closes) {
  if (closes.length < 15) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < 15; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / 14;
  let avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function runTest() {
  console.log('🚀 Đang tổng hợp dữ liệu với độ nhạy cao...');
  const bot = new TelegramBot(TELEGRAM_TOKEN);
  
  try {
    const fgRes = await axios.get('https://api.alternative.me/fng/');
    const sentiment = parseInt(fgRes.data.data[0].value);

    const assets = [
      { id: 'bitcoin', symbol: 'BTC', bitfinexId: 'tBTCUSD' },
      { id: 'ethereum', symbol: 'ETH', bitfinexId: 'tETHUSD' },
      { id: 'binancecoin', symbol: 'BNB', bitfinexId: 'tBNBUSD' },
      { id: 'pax-gold', symbol: 'XAU (VÀNG)', bitfinexId: 'tXAUUSD' }
    ];

    const cgRes = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,pax-gold&vs_currencies=usd&include_24hr_change=true');
    const priceData = cgRes.data;

    const analysisData = await Promise.all(assets.map(async (asset) => {
      try {
        const candleRes = await axios.get(`https://api-pub.bitfinex.com/v2/candles/trade:1h:${asset.bitfinexId}/hist?limit=20`);
        const closes = candleRes.data.map((c) => c[2]).reverse();
        const rsi = calculateRSI(closes);
        
        const price = priceData[asset.id].usd;
        const change24h = priceData[asset.id].usd_24h_change;

        let trend = "⚖️ SIDEWAYS";
        let advice = "WAIT";
        let isBullish = true;

        // Logic Dynamic nhạy bén hơn
        if (rsi <= 45) {
          if (rsi < 35 || sentiment < 35) {
            trend = "🔥 STRONG BULLISH";
            advice = "STRONG LONG";
          } else {
            trend = "🚀 BULLISH bias";
            advice = "LONG (BUY)";
          }
          isBullish = true;
        } else if (rsi >= 55) {
          if (rsi > 65 || sentiment > 65) {
            trend = "💀 STRONG BEARISH";
            advice = "STRONG SHORT";
          } else {
            trend = "⚠️ BEARISH bias";
            advice = "SHORT (SELL)";
          }
          isBullish = false;
        }

        const tp1 = isBullish ? price * 1.012 : price * 0.988;
        const tp2 = isBullish ? price * 1.025 : price * 0.975;
        const sl = isBullish ? price * 0.985 : price * 1.015;

        return {
          symbol: asset.symbol,
          price: price.toLocaleString(),
          change: change24h.toFixed(2),
          rsi: rsi.toFixed(2),
          trend,
          advice,
          tp1: tp1.toLocaleString(),
          tp2: tp2.toLocaleString(),
          sl: sl.toLocaleString()
        };
      } catch (e) { return null; }
    }));

    const validData = analysisData.filter(d => d !== null);

    const message = `
🤖 **BẢN TIN DỰ BÁO (DYNAMIC MODE)** 🤖
----------------------------------
🧠 Chỉ số F&G (Crypto): \`${sentiment}/100\`

${validData.map(d => `
**${d.symbol}** | RSI: \`${d.rsi}\`
💰 Giá: \`$${d.price}\` (${d.change}%)
📉 Xu hướng: **${d.trend}**
💡 Khuyên dùng: **${d.advice}**
🎯 TP1: \`$${d.tp1}\` | TP2: \`$${d.tp2}\`
🛑 SL: \`$${d.sl}\`
`).join('')}
----------------------------------
⏰ *Tín hiệu đã được điều chỉnh độ nhạy.*
    `;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('✅ Đã gửi tin nhắn (Bản nhạy bén) về Telegram!');

  } catch (error) {
    console.error('❌ Lỗi test:', error.message);
  }
}

runTest();
