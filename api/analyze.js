export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageDataUrl, thriftPrice, note } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Самая дешевая и быстрая модель с поддержкой фото
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Ты эксперт BrandScan. Проанализируй вещь. Цена в секонде: ${thriftPrice}$. Заметка: ${note}. Верни ТОЛЬКО JSON.` },
              { type: "image_url", image_url: { url: imageDataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" } // Гарантирует получение JSON
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Ошибка API: " + error.message });
  }
}
