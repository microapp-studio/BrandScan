export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { imageDataUrl, thriftPrice, note } = req.body;
  const key = process.env.GEMINI_API_KEY;

  if (!key) return res.status(500).json({ error: "Ключ GEMINI_API_KEY не задан в Vercel" });

  const base64Data = imageDataUrl.split(',')[1];

  try {
    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Ты эксперт BrandScan. Оцени вещь. Цена в секонде: ${thriftPrice}$. Заметка: ${note}. Верни ТОЛЬКО JSON: {"brand": "...", "item_type": "...", "new_price_range": "...", "used_price_range": "...", "authenticity": "...", "confidence": 100, "decision": "...", "reason": "..."}` },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }]
      })
    });

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    // Очистка от возможных markdown-кавычек ИИ
    const cleanJson = textResponse.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(cleanJson));
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
