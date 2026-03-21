export async function extractFromImage(apiKey, imageBase64) {
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");
  
  const systemPrompt = `너는 영어 시험지 문제 인식 전문가야. 
제공된 이미지에서 다음 세 가지 요소를 정확히 분리해서 파싱해줘.
1. original_passage: 지문 내용 원문 전체 (박스 안의 글)
2. question_text: 지문 위에 있는 문제 발문 전체 (예: "20. 위 글의 밑줄 친 (a)~(c)에 들어갈 알맞은 말로 짝지어진 것은?")
3. options_text: 지문 아래에 있는 보기, 선택지 표, 서술형 조건 등 문제 관련 텍스트 전문.

출력 형식은 반드시 아래 JSON 형태여야 해:
{
  "original_passage": "...",
  "question_text": "...",
  "options_text": "..."
}`;

  const defaultModel = 'gpt-4o';
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: "이 이미지에서 지문, 문제, 보기를 추출해줘." },
        { type: "image_url", image_url: { url: imageBase64 } }
      ]
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: defaultModel,
      messages: messages,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "이미지 추출 API 호출에 실패했습니다.");
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  return {
    original_passage: content.original_passage || "",
    question_text: content.question_text || "",
    options_text: content.options_text || ""
  };
}

export async function generatePassageVariation(apiKey, extractedData, difficulty) {
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");
  
  const systemPrompt = `[Role]
당신은 한국의 중·고등학교 내신 및 수능 영어 시험 출제에 능통한 '최고 수준의 영어 교육 전문가'이자 '지문 재창작(Content Replacement) 마스터'입니다.
[Objective]
사용자가 영어 문항(지문+문제+선지+보기) 정보를 제공하면, 스토리·소재·등장인물을 완전히 새롭게 창작하되, 다음을 100% 보존합니다:
- 문제 발문의 구조, 정답 번호, 선지 구성, 보기(Box) 단어
- 빈칸/밑줄이 위치한 문장의 문법 골격(Grammatical Skeleton)
즉, "완전히 다른 이야기지만, 같은 문법 문제가 성립하는 지문"을 만드는 것이 목표입니다.

[핵심 개념: 문법 골격(Grammatical Skeleton)이란?]
빈칸·밑줄·서술형 출제 포인트가 되는 문법 구조 자체를 말합니다.
예시:
원문: I have never seen (a)______ a white bird before.
문법 골격: S + have never + p.p. + (a)______ + a + [형용사] + [명사] + before.
변형 OK: She had never tasted (a)______ a delicious cake before. (소재 변경, 구조 동일)

[Strict Constraints (절대 규칙)]
1. 문제 원형 보존: 발문 구조, 정답 번호, 1~5번 선지 구성, 보기(Box) 단어는 토씨 하나 틀리지 않고 동일 유지.
2. 스토리 완전 교체: 등장인물, 배경, 사건, 소재 교체. 단순히 고유명사만 치환 금지.
3. 빈칸/밑줄 문장의 문법 골격 고정: 정답이 도출되는 문법 구조 유지, 어휘 교체 가능.
4. 서술형 문제 동기화 규칙 (Sync Rule): 서술형 문제에서 지문을 참조하는 빈칸 문장의 내용어(명사/형용사) 등도 새 지문에 맞춰 반드시 업데이트.
5. 스포일러 절대 금지: 보기(Box) 단어, 정답 단어의 동의어/파생어 지문 노출 절대 금지.
6. 난이도 및 분량 유지: [${difficulty}] 수준의 어휘/문법 사용, 분량 ±10%.

[출력 형식]
반드시 다음 JSON 형식으로 응답할 것:
{
  "transformed_result": "■ 다음 글을 읽고, 물음에 답하시오.\\n\\n[새로운 변형 통지문텍스트]\\n\\n[동기화된 문제 및 보기 텍스트]\\n\\n---\\n🔍 변형 해설\\n새 스토리 요약:\\n고정된 문법 골격 목록:\\n스포일러 우회 단어:\\n동기화 적용 내역:"
}`;

  const userContent = `[원본 지문]
${extractedData.original_passage}

[원본 문제]
${extractedData.question_text}

[원본 보기/선지]
${extractedData.options_text}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "지문 변형 API 호출에 실패했습니다.");
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  return content.transformed_result || "";
}
