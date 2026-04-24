export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed' });
  }

  try {
    const { imageDataUrl, thriftPrice, note } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set in environment variables' });
    }

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Image is required as data URL' });
    }

    const prompt = `
Ты BrandScan — помощник для секонда, винтажа и ресейла.

Задача:
1. Определи бренд и тип вещи по фото ярлыка/вещи.
2. Дай ориентир новой цены.
3. Дай ориентир цены на б/у рынке.
4. Сравни с ценой в секонде.
5. Скажи: "Брать", "Брать с осторожностью", "Не брать" или "Нужно больше фото".
6. По оригинальности не делай категоричных заявлений. Используй: "вероятно оригинал", "есть сомнения", "похоже на подделку", "недостаточно данных".
7. Если данных мало, обязательно попроси дополнительные фото.

Цена в секонде: ${thriftPrice || 'не указана'}
Комментарий пользователя: ${note || 'нет'}

Ответ верни СТРОГО в JSON без markdown:
{
  "brand": "",
  "item_type": "",
  "new_price_range": "",
  "used_price_range": "",
  "thrift_price": "",
  "authenticity": "",
  "confidence": 0,
  "decision": "",
  "reason": "",
  "need_more_photos": [],
  "sources": []
}

Пиши коротко и полезно. Валюта — доллары США. Если цена неизвестна, напиши "нет надежных данных".
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' }
            ]
          }
        ],
        tools: [{ type: 'web_search_preview' }]
      })
    });

    const raw = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: raw.error?.message || 'OpenAI API error', raw });
    }

    const text =
      raw.output_text ||
      raw.output?.flatMap(item => item.content || []).map(c => c.text || '').join('\n') ||
      '';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      parsed = {
        brand: "Не определен",
        item_type: "Не определено",
        new_price_range: "нет надежных данных",
        used_price_range: "нет надежных данных",
        thrift_price: thriftPrice ? `$${thriftPrice}` : "не указана",
        authenticity: "недостаточно данных",
        confidence: 30,
        decision: "Нужно больше фото",
        reason: text || "ИИ не вернул структурированный JSON.",
        need_more_photos: ["внутренний ярлык", "состав", "логотип крупно", "швы", "фурнитура", "общий вид вещи"],
        sources: ["Автоматический анализ без подтвержденной экспертизы."]
      };
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
