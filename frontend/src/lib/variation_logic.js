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
2. 스토리 완전 교체 및 어휘 교체율 극대화: 등장인물, 배경, 사건, 소재를 완전히 교체하세요. 단순 고유명사 치환을 넘어, 원본과 겹치지 않는 새로운 어휘 사용 비율을 기존 대비 20% 이상 대폭 늘려 지문을 재창조해야 합니다.
3. 빈칸/밑줄 문법 골격 고정 및 [의도적 문법 오류 보존]: 문법 출제 포인트가 되는 구조는 반드시 고정하세요. ★특히 어법 문제에서 원문의 밑줄/빈칸이 "어법상 틀린 형태(오답)"로 제시되었다면, 변형된 지문에서도 해당 부분은 반드시 "어법상 틀린 구조(오답)"를 똑같이 유지해야 합니다. 절대 AI 임의로 올바른 문장(정답)으로 고치지 마세요.
4. ⛔ 서술형 문제 동기화 규칙 (Sync Rule) — 매우 중요
서술형 문제(21번, 22번 등)에서 지문의 (가), (나), (다) 등을 참조하는 빈칸 문장이 있는 경우, 해당 빈칸 문장의 내용어(명사, 형용사 등)도 변형된 지문에 맞춰 반드시 업데이트하세요. 단, 문법 구조와 정답은 동일하게 유지합니다.
구체적 적용 방법:

빈칸 문장 안의 고유명사·일반명사·형용사 등 내용어 → 새 지문의 (가)(나)(다)에 등장하는 단어로 교체
빈칸 문장의 문법 구조·빈칸 위치·정답 → 원본과 100% 동일하게 유지

예시:
[원본]
지문 (가): "The crow was very happy with his life."
21번 빈칸: "The crow was very ㉠______ with his life."
22번 원문: "I thought that I was the happiest bird."

[변형 후]
지문 (가): "The painter was very pleased with his life."
21번 빈칸: "The painter was very ㉠______ with his life."  ← 'crow'→'painter'로 동기화
22번 원문: "I thought that I was the happiest person."  ← 'bird'→'person'으로 동기화
체크 방법: 서술형 문제의 빈칸 문장을 읽었을 때, 변형된 지문의 내용과 자연스럽게 연결되는지 확인하세요. "이 문장이 이 지문에서 나온 것이 맞는가?"라는 질문에 YES여야 합니다.
5. ⛔ 스포일러 절대 금지 (Anti-Spoiler Rule)
<보기>(Box)에 제시된 단어, 선지의 정답 단어, 그리고 **그 파생어(동일 어근)**는 변형 지문에 절대 노출하지 마세요.
(예: 보기에 'reflect'가 있으면 → 지문에 'reflection', 'reflects', 'reflective' 사용 금지. 'gaze at his image', 'stare at himself' 등으로 우회)
(예: 보기에 'satisfy'가 있으면 → 지문에 'satisfied', 'satisfaction', 'satisfying' 사용 금지. 'content'도 의미가 너무 유사하므로 피하세요. 'pleased', 'cheerful', 'delighted' 등 의미적 거리가 있는 단어로 우회)

스포일러 판단 기준:
사용 금지: 보기/정답 단어의 어근이 같은 모든 단어 (예: satisfy → satisfied, satisfying, satisfaction)
사용 주의: 보기/정답 단어의 직접적 동의어 (예: satisfy ↔ content). 학생이 "이 단어가 힌트네"라고 느낄 수 있는 단어는 피하세요.
사용 가능: 의미적 거리가 충분한 유사어 (예: satisfy → pleased, cheerful, delighted, glad)

6. 난이도 및 분량 유지
원본과 어휘 수준(Lexical Level), 총 단어 수(±10% 이내)를 맞추세요.
원본이 초등 수준이면 초등 수준, 고등 수준이면 고등 수준으로 유지합니다.

7. 빈칸 구조 중복 금지: (a)____ 와 같이 정답이 들어갈 빈칸을 유지할 때, 원래 빈칸의 정답이 되는 단어(예: such 등)를 빈칸 바로 앞뒤 지문에 실수로 노출하거나 중복해서 작성하지 않도록 각별히 주의하세요.

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
