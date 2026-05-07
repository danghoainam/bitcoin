import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  if (!TELEGRAM_TOKEN || !CHAT_ID) return res.status(500).json({ error: 'Missing configuration' });

  const bot = new TelegramBot(TELEGRAM_TOKEN);

  try {
    // 1. Lấy chỉ số Fear & Greed (Chỉ số chung)
    const fgRes = await axios.get('https://api.alternative.me/fng/');
    const sentiment = parseInt(fgRes.data.data[0].value);

    // 2. Lấy giá từ CoinCap (Không bị chặn trên Vercel)
    const coins = [
      { id: 'bitcoin', symbol: 'BTC' },
      { id: 'ethereum', symbol: 'ETH' },
      { id: 'binance-coin', symbol: 'BNB' }
    ];

    const responses = await Promise.all(
      coins.map(coin => axios.get(`https://api.coincap.io/v2/assets/${coin.id}`))
    );

    const analysisData = responses.map((response, index) => {
      const data = response.data.data;
      const coin = coins[index];
      const price = parseFloat(data.priceUsd);
      const change24h = parseFloat(data.changePercent24Hr);
      
      // Logic dự báo dựa trên kết hợp Sentiment + 24h Change
      let trend = "⚖️ SIDEWAYS";
      let advice = "WAIT";
      let isBullish = true;

      if (sentiment < 35 && change24h < -2) {
        trend = "🚀 BULLISH";
        advice = "LONG";
        isBullish = true;
      } else if (sentiment > 65 && change24h > 2) {
        trend = "⚠️ BEARISH";
        advice = "SHORT";
        isBullish = false;
      }

      // Tính toán TP/SL
      const tp1 = isBullish ? price * 1.02 : price * 0.98;
      const tp2 = isBullish ? price * 1.05 : price * 0.95;
      const sl = isBullish ? price * 0.97 : price * 1.03;

      return {
        symbol: coin.symbol,
        price: price > 100 ? price.toLocaleString() : price.toFixed(2),
        change: change24h.toFixed(2),
        trend,
        advice,
        tp1: tp1 > 100 ? tp1.toLocaleString() : tp1.toFixed(2),
        tp2: tp2 > 100 ? tp2.toLocaleString() : tp2.toFixed(2),
        sl: sl > 100 ? sl.toLocaleString() : sl.toFixed(2)
      };
    });

    const message = `
🎯 **TÍN HIỆU CHI TIẾT TỪNG COIN** 🎯
----------------------------------
🧠 Tâm lý thị trường: \`${sentiment}/100\`

${analysisData.map(d => `
**${d.symbol}** | Biến động: \`${d.change}%\`
💰 Giá: \`$${d.price}\`
📈 Dự báo: **${d.trend}** (${d.advice})
🎯 TP: \`$${d.tp1}\` | \`$${d.tp2}\`
❌ SL: \`$${d.sl}\`
`).join('')}
----------------------------------
⏰ *Dữ báo dựa trên biến động giá & tâm lý chung.*
    `;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("Lỗi bot:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
