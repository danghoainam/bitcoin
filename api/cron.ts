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

    // 2. Lấy giá từ CoinGecko (Nguồn uy tín nhất cho Vercel)
    const cgRes = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true');
    const data = cgRes.data;

    const coins = [
      { id: 'bitcoin', symbol: 'BTC', name: 'bitcoin' },
      { id: 'ethereum', symbol: 'ETH', name: 'ethereum' },
      { id: 'binancecoin', symbol: 'BNB', name: 'binancecoin' }
    ];

    const analysisData = coins.map(coin => {
      const price = data[coin.id].usd;
      const change24h = data[coin.id].usd_24h_change;
      
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

      const tp1 = isBullish ? price * 1.02 : price * 0.98;
      const tp2 = isBullish ? price * 1.05 : price * 0.95;
      const sl = isBullish ? price * 0.97 : price * 1.03;

      return {
        symbol: coin.symbol,
        price: price.toLocaleString(),
        change: change24h.toFixed(2),
        trend,
        advice,
        tp1: tp1.toLocaleString(),
        tp2: tp2.toLocaleString(),
        sl: sl.toLocaleString()
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
