const joinUrl = (base, path) => `${base.replace(/\/$/, '')}${path}`;

const readError = async (res) => {
  try {
    const data = await res.json();
    return data.error?.message || data.error || res.statusText;
  } catch {
    return res.statusText;
  }
};

export const completeOpenAiJson = async ({ prompt, system, model, apiKey, baseUrl, signal }) => {
  const root = baseUrl || 'https://api.openai.com/v1';
  const res = await fetch(joinUrl(root, '/chat/completions'), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${await readError(res)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
};

export const completeClaudeJson = async ({ prompt, system, model, apiKey, signal }) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: `${prompt}\n\nRespond with JSON only.` }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude error: ${await readError(res)}`);
  }
  const data = await res.json();
  return (data.content || []).map((part) => part.text || '').join('');
};

export const completeGeminiJson = async ({ prompt, system, model, apiKey }) => {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const gemini = genAI.getGenerativeModel({
    model: model || 'gemini-2.5-flash',
    systemInstruction: system,
  });
  const result = await gemini.generateContent(prompt);
  return result.response.text();
};
