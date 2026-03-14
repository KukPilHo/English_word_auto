export async function generateContent(apiKey, model, systemPrompt, userPrompt) {
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다. 메인 화면 하단에서 설정해주세요.");
  
  const isAnthropic = model.includes('claude');
  const apiUrl = isAnthropic 
    ? 'https://api.anthropic.com/v1/messages' 
    : 'https://api.openai.com/v1/chat/completions';

  const body = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "LLM API request failed.");
  }

  const data = await response.json();
  const rawContent = data.choices[0].message.content;
  return JSON.parse(rawContent);
}

export async function parseUnstructuredWords(apiKey, model, text, imageBase64) {
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다. 메인 화면 하단에서 설정해주세요.");
  // Default to gpt-4o for vision
  const useModel = imageBase64 ? 'gpt-4o' : model;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const systemPrompt = `너는 텍스트나 이미지에서 영어 단어와 영영풀이를 추출하는 전문가야.
사용자가 제공한 데이터에서 영어 단어(word)와 그 단어의 영영풀이(meaning_en)를 추출해서 JSON 배열로 반환해.
형식: { "words": [ { "word": "apple", "meaning_en": "a round fruit with red or green skin" } ] }
만약 한국어 뜻이나 품사가 포함되어 있다면 무시하고 오직 영어 단어와 영영풀이만 추출해. 영영풀이가 없다면 직접 해당 단어의 짧고 쉬운 영영풀이를 작성해서 넣어줘.`;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: text ? text : "이 이미지에서 단어와 영영풀이를 추출해줘." },
        { type: "image_url", image_url: { url: imageBase64 } }
      ]
    });
  } else {
    messages.push({ role: "user", content: text });
  }

  const body = {
    model: useModel,
    messages: messages,
    temperature: 0.1,
    response_format: { type: "json_object" }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "AI 파싱에 실패했습니다.");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content).words || [];
}

export async function parseUnstructuredPassage(apiKey, model, text, imageBase64) {
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");
  const useModel = imageBase64 ? 'gpt-4o' : model;
  
  const systemPrompt = `너는 영어 지문 인식 전문가야. 주어진 텍스트나 이미지에서 순수하게 영어 지문 원문만 추출해줘. 한글 해설이나 문제 번호 등은 제외해.
비어있다면 빈 문자열을 반환하고, 지문이 복수라면 '---' 문자로 구분해서 합쳐서 반환해.
출력 형식은 오직 JSON 형태여야 해: { "passage": "추출된 영어 지문 전문" }`;

  const messages = [{ role: "system", content: systemPrompt }];

  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: text ? text : "이 이미지에서 영어 지문을 추출해줘." },
        { type: "image_url", image_url: { url: imageBase64 } }
      ]
    });
  } else {
    messages.push({ role: "user", content: text });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: useModel,
      messages: messages,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "지문 인식에 실패했습니다.");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content).passage || "";
}
