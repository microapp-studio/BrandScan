export default async function handler(req, res) {
  // 1. Проверка метода
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  // 2. ПРОВЕРКА КЛЮЧА (Диагностика)
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ 
      error: 'Критическая ошибка: GEMINI_API_KEY не найден в системе Vercel. Проверьте вкладку Settings -> Environment Variables.' 
    });
  }

  try {
    const { imageDataUrl, thriftPrice, note } = req.body;

    if (!imageDataUrl) {
      return res.status(400).json({ error: 'Нет изображения' });
    }

    // Очистка base64
    const base64Data = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    const prompt = `Ты эксперт по винтажной одежде BrandScan. Проанализируй фото. 
    Цена в секонде: ${thriftPrice || 'не указана'}$. Заметка: ${note || 'нет'}.
    Верни JSON: { "brand": "", "item_type": "", "new_price_range": "", "used_price_range": "", "authenticity": "", "confidence": 0, "decision": "Брать/Не брать/Осторожно", "reason": "" }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Ошибка Gemini API', details: data });
    }

    const resultText = data.candidates[0].content.parts[0].text;
    return res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    return res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
  }
}
