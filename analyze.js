export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed' });
  }

  try {
    const { imageDataUrl, thriftPrice, note } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set in Vercel Environment Variables' });
    }

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const prompt = `
Ты BrandScan — помощник для секонда, винтажа и ресейла.

Проанализируй фото ярлыка или вещи.
Нужно дать короткий практический ответ:
- что за бренд;
- что за вещь;
- сколько примерно стоит новая вещь;
- сколько примерно стоит на б/у рынке;
- стоит ли брать по цене в секонде;
- оригинал или есть сомнения;
- что сфотографировать дополнительно.

Цена в секонде: ${thriftPrice || 'не указана'}
Комментарий пользователя: ${note || 'нет'}

Правила:
1. Не утверждай подлинность на 100%.
2. Используй формулировки: "вероятно оригинал", "есть сомнения", "похоже на подделку", "недостаточно данных".
3. Если бренд массовый и недорогой, так и скажи.
4. Если цена в секонде не указана, решение должно учитывать отсутствие цены.
5. Ответ только JSON, без markdown.

Формат:
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
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl }
            ]
          }
        ]
      })
    });

    const raw = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: raw.error?.message || 'OpenAI API error'
      });
    }

    const text =
      raw.output_text ||
      (raw.output || []).flatMap(item => item.content || []).map(c => c.text || '').join('\n') ||
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
        reason: text || "ИИ не вернул структурированный ответ.",
        need_more_photos: ["внутренний ярлык", "состав", "страна производства", "общий вид вещи", "швы и фурнитура"],
        sources: ["Автоматический анализ. Не является экспертизой подлинности."]
      };
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
