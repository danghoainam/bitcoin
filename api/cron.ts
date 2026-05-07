import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cấu hình (Bạn sẽ điền các biến này lên Vercel Environment Variables)
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;
  const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY; // Optional nhưng nên có

  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Missing Telegram configuration' });
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN);

  try {
    // 2. Lấy giá BTC từ Binance
    const priceRes = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const price = parseFloat(priceRes.data.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    // 3. Lấy chỉ số Fear & Greed
    const fgRes = await axios.get('https://api.alternative.me/fng/');
    const fgData = fgRes.data.data[0];
    const sentiment = fgData.value;
    const status = fgData.value_classification;

    // 4. Lấy tin tức từ CryptoPanic
    let newsSummary = "";
    try {
        const newsRes = await axios.get(`https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API_KEY || ''}&currencies=BTC&filter=hot`);
        const topNews = newsRes.data.results.slice(0, 3);
        newsSummary = topNews.map((n: any) => `- [${n.title}](${n.url})`).join('\n');
    } catch (e) {
        newsSummary = "Không thể lấy tin tức lúc này.";
    }

    // 5. Logic dự báo đơn giản
    let prediction = "Xu hướng: ⚖️ Đang tích lũy (Sideways)";
    let icon = "📊";
    
    if (parseInt(sentiment) < 25) {
        prediction = "Xu hướng: 🚀 Có khả năng TĂNG (Thị trường quá sợ hãi - Cơ hội mua)";
        icon = "📉";
    } else if (parseInt(sentiment) > 75) {
        prediction = "Xu hướng: ⚠️ Có khả năng GIẢM (Thị trường quá tham lam - Nên chốt lời)";
        icon = "📈";
    }

    const message = `
${icon} **BÁO CÁO TÀI CHÍNH BITCOIN** ${icon}
----------------------------------
💰 **Giá hiện tại:** \`${price}\`
🧠 **Tâm lý (Fear & Greed):** \`${sentiment}/100\` (${status})

📰 **Tin tức nổi bật:**
${newsSummary}

🔮 **Dự báo:**
${prediction}
----------------------------------
⏰ *Cập nhật tự động bởi BTC-Bot*
    `;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown', disable_web_page_preview: false });

    return res.status(200).json({ success: true, price, sentiment });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
