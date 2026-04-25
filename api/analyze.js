export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageDataUrl, thriftPrice, note } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });

  // Очистка base64 от префикса
  const base64Data = imageDataUrl.split(',')[1];

  const prompt = `
    Ты эксперт по винтажной и брендовой одежде BrandScan. 
    Проанализируй фото ярлыка. 
    Цена в магазине: ${thriftPrice || 'не указана'}$
    Заметка пользователя: ${note || 'нет'}
    
    Верни ответ СТРОГО в формате JSON:
    {
      "brand": "название",
      "item_type": "тип вещи",
      "new_price_range": "цена новой",
      "used_price_range": "цена б/у",
      "authenticity": "вероятно оригинал/копия/сомнения",
      "confidence": 0-100,
      "decision": "Брать / Не брать / Осторожно",
      "reason": "короткое пояснение почему",
      "need_more_photos": ["что еще снять"]
    }
  `;

  try {
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
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
