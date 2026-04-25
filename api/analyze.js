export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageDataUrl, thriftPrice, note } = req.body;
  
  // Берем ключ из системы Vercel
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY не найден. Проверьте вкладку Settings в Vercel.' });
  }

  try {
    const base64Data = imageDataUrl.split(',')[1];
    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Ты эксперт BrandScan. Оцени вещь. Цена в секонде: ${thriftPrice}$. Заметка: ${note}. Ответ дай СТРОГО в формате JSON.` },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    return res.status(200).json(JSON.parse(resultText));
    
  } catch (error) {
    return res.status(500).json({ error: "Ошибка ИИ: " + error.message });
  }
}
