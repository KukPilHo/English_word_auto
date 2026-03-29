export async function extractFromInputs(apiKey, imagesBase64Array, sourceText) {
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");

  const systemPrompt = `너는 영어 시험지 문제 인식 최고 전문가야. 
제공된 이미지 및/또는 텍스트에서 다음 세 가지 요소를 정확히 분리해서 파싱해줘.

**[이미지 추출(OCR) 시 강력한 주의사항]**
1. **원문자/기호 완벽 인식**: ㉠, ㉡, ㉢, ⓐ, ⓑ, ⓒ, ①, ② 등 동그라미 기호나 (A), (a) 같은 괄호 기호를 절대 임의의 다른 이상한 기호(◎, ◉ 등)나 뭉뚱그린 기호로 대체하지 마세요. 보이는 그대로 정확한 유니코드 원문자로 변환해 표기하세요.
2. **한국어 오탈자 문맥 교정**: 이미지 화질 문제로 '밑...긋...칰'처럼 깨져 보이는 한국어 발문 텍스트가 있다면, 문맥을 파악하여 반드시 올바른 한국어 단어('밑줄 친')로 완벽하게 교정해서 추출하세요. 절대 깨진 글자 그대로 출력하지 마세요.
3. **줄바꿈(Enter) 가독성 유지**: 문제 번호가 바뀌거나 보기가 나누어지는 등 원본에서 줄바꿈이 있는 곳은 반드시 '\\\\n' 기호를 넣어 여러 줄이 한 줄로 뭉개지지 않도록 구분해 추출하세요.

분리 파싱할 세 가지 요소:
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
  
  const userContent = [
    { type: "text", text: "다음 제공된 이미지 및/또는 직접 입력된 텍스트에서 지문, 문제, 보기를 정확히 추출해줘. 텍스트가 명시적으로 제공되었다면 그 텍스트를 최우선으로 참고해." }
  ];
  
  if (sourceText && sourceText.trim() !== '') {
    userContent.push({ type: "text", text: `[직접 입력된 텍스트]\n${sourceText}` });
  }
  
  if (imagesBase64Array && imagesBase64Array.length > 0) {
    imagesBase64Array.forEach(img => {
      userContent.push({ type: "image_url", image_url: { url: img } });
    });
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
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

[Objective — 매우 중요!]
사용자가 영어 문항(지문+문제+선지/보기) 정보를 제공합니다.
당신의 임무는 **오직 "지문(passage)" 부분만** 소재·등장인물·배경을 완전히 새롭게 변형하는 것입니다.

⛔⛔⛔ 절대 규칙: 문제(question_text)와 보기/선지(options_text)는 원본 그대로 100% 보존해야 합니다.
- 문제 발문의 텍스트를 절대 재작성하지 마세요.
- 보기/선지의 텍스트를 절대 재작성하지 마세요.
- 서술형 동기화가 필요한 경우에만, 문제/보기 안의 내용어(고유명사, 일반명사 등)를 변형된 지문에 맞게 최소한으로 교체하세요. 이 경우에도 문법 구조, 정답, 빈칸 위치는 절대 변경하지 마세요.

[핵심 개념: 문법 골격(Grammatical Skeleton)이란?]
빈칸·밑줄·서술형 출제 포인트가 되는 문법 구조 자체를 말합니다.
예시:
원문: I have never seen (a)______ a white bird before.
문법 골격: S + have never + p.p. + (a)______ + a + [형용사] + [명사] + before.
변형 OK: She had never tasted (a)______ a delicious cake before. (소재 변경, 구조 동일)

[Strict Constraints (절대 규칙)]
1. ⛔ 문제/보기 원형 절대 보존 (Critical #1):
   - 문제 발문(question_text)은 원본 텍스트를 한 글자도 바꾸지 않고 그대로 유지하세요.
   - 보기/선지(options_text)도 원본 텍스트를 한 글자도 바꾸지 않고 그대로 유지하세요.
   - 유일한 예외: 서술형 동기화가 필요한 경우, 문제/보기 안의 내용어만 최소한으로 교체 (아래 규칙 참고).

2. 스토리 완전 교체 및 어휘 교체율 극대화: 등장인물, 배경, 사건, 소재를 완전히 교체하세요. 단순 고유명사 치환을 넘어, 원본과 겹치지 않는 새로운 어휘 사용 비율을 기존 대비 20% 이상 대폭 늘려 지문을 재창조해야 합니다.

3. 기호/밑줄 완벽 보존 및 [의도적 오류 강제 유지] (가장 핵심적인 Critical!): 
- 원본에서 ⓐ is occurred 처럼 의도적인 어법 오답(비문법적 표현)이 출제되었다면, 변형 지문의 동일 기호 위치에도 **"수동태 불가 동사의 수동태(예: is happened, is occurred)"나 "단복수 불일치" 등 중학생이 봐도 명백히 틀린 비문법적 황당한 오류**를 무조건 적용해야 합니다! 단순히 is changed 같은 올바른 문장을 써놓고 오답이라고 우기면 안 됩니다. 

4. ⛔ 서술형 문제 동기화 규칙 (Sync Rule) — 매우 중요
서술형 문제(21번, 22번 등)에서 지문의 (가), (나), (다) 등을 참조하는 빈칸 문장이 있는 경우, 해당 빈칸 문장의 내용어(명사, 형용사 등)도 변형된 지문에 맞춰 반드시 업데이트하세요. 단, 문법 구조와 정답은 동일하게 유지합니다.
구체적 적용 방법:
빈칸 문장 안의 고유명사·일반명사·형용사 등 내용어 → 새 지문의 (가)(나)(다)에 등장하는 단어로 교체
빈칸 문장의 문법 구조·빈칸 위치·정답 → 원본과 100% 동일하게 유지

예시:
[원본]
지문 (가): "The crow was very happy with his life."
21번 빈칸: "The crow was very ㉠______ with his life."
[변형 후]
지문 (가): "The painter was very pleased with his life."
21번 빈칸: "The painter was very ㉠______ with his life."  ← 'crow'→'painter'로 동기화
체크 방법: 서술형 문제의 빈칸 문장을 읽었을 때, 변형된 지문의 내용과 자연스럽게 연결되는지 확인하세요.

5. ⛔ 스포일러 절대 금지 (Anti-Spoiler Rule)
<보기>(Box)에 제시된 단어, 선지의 정답 단어, 그리고 **그 파생어(동일 어근)**는 변형 지문에 절대 노출하지 마세요.
스포일러 판단 기준:
사용 금지: 보기/정답 단어의 어근이 같은 모든 단어
사용 주의: 보기/정답 단어의 직접적 동의어
사용 가능: 의미적 거리가 충분한 유사어

6. ⛔ 지문 언어 절대 규칙 (English Passage ONLY)
변형된 지문(본문 텍스트)은 반드시 **순수 영어(English)**로만 작성해야 합니다.

7. 철저한 난이도 및 분량 통제 (Vocabulary Level Control)
현재 지정된 난이도: [${difficulty}]
- 원본의 분량(±10% 이내)을 유지하세요.
- [경고] 중2~중3 수준을 지정받은 경우, 'fortnight', 'ensues' 등 어려운 단어는 절대 사용 금지입니다. 반드시 'two weeks', 'starts' 같이 가장 쉬운 중학교 기초 필수 어휘(CEFR A1~A2 수준)만 사용하세요.

8. 빈칸 구조 중복 금지: (a)____ 와 같이 정답이 들어갈 빈칸을 유지할 때, 원래 빈칸의 정답이 되는 단어를 빈칸 바로 앞뒤 지문에 실수로 노출하지 않도록 주의하세요.

9. ⛔ 객관식 정답 논리 엄격 검증: "일치하지 않는 것을 모두 고르시오" 등의 문제에서, 본문과 일치하지 않는 선지가 실제로 2개 이상 만들어졌다면, 해설에도 반드시 그 2개 이상의 번호를 모두 기재하세요.

[출력 형식 — 반드시 이 구조의 JSON을 출력할 것]
{
  "thought_process": {
    "grammar_error_enforcement": "원본 어법 함정을 변형 지문에도 명백하게 틀린 비문법적 형태로 유지했는가?",
    "writing_sync_check": "서술형 동기화: 내용어 교체가 필요한 곳을 정확히 교체했는가?",
    "question_preservation_check": "문제 발문과 보기/선지를 원본 그대로 보존했는가? (서술형 동기화 내용어 교체 외에 변경사항이 없는가?)",
    "vocabulary_level_check": "지정된 난이도에 맞는 어휘만 사용했는가?"
  },
  "transformed_passage": "변형된 지문 본문만 여기에 작성 (문제/보기 텍스트 포함 금지)",
  "synced_question_text": "원본 문제 텍스트를 그대로 복사. 서술형 동기화가 필요한 내용어만 최소 교체. 동기화 불필요 시 원본과 100% 동일하게 유지.",
  "synced_options_text": "원본 보기/선지 텍스트를 그대로 복사. 서술형 동기화가 필요한 내용어만 최소 교체. 동기화 불필요 시 원본과 100% 동일하게 유지.",
  "variation_notes": "🔍 변형 해설\\n새 스토리 요약:\\n고정된 문법 골격 목록:\\n스포일러 우회 단어:\\n동기화 적용 내역:",
  "answer_explanation": "💡 [정답 및 해설]\\n각 문제별 정확한 정답과 상세한 해설"
}`;

  const userContent = `[원본 지문]
${extractedData.original_passage}

[원본 문제]
${extractedData.question_text}

[원본 보기/선지]
${extractedData.options_text}

⚠️ 최종 확인: "transformed_passage"에는 변형된 지문만 출력하세요. "synced_question_text"와 "synced_options_text"는 원본 문제/보기를 그대로 복사하되, 서술형 동기화가 필요한 내용어만 최소한으로 교체하세요.`;

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
    throw new Error(err.error?.message || "지문 변형 API 1차 호출에 실패했습니다.");
  }

  const data = await response.json();
  const firstPassContent = data.choices[0].message.content;

  // --- 2차 검증(Verification & Refinement) 루프 ---
  const verificationPrompt = `당신은 방금 생성된 영어 내신/수능 형 지문 변형 문제의 완벽성을 검증하고 종합 수정하는 '최종 감수자(Editor-in-Chief)'입니다.
다음은 1차로 생성된 문제 세트입니다. 아래 체크리스트를 바탕으로 철저히 검증하고, 수정이 필요한 곳을 모두 수정한 "최종 JSON 결과"를 출력해주세요.

[원본 문제 (반드시 이것과 대조할 것)]
${extractedData.question_text}

[원본 보기/선지 (반드시 이것과 대조할 것)]
${extractedData.options_text}

[체크리스트]
1. ⛔ 문제/보기 원본 보존 검증 (가장 중요!!!):
   - synced_question_text가 원본 question_text와 동일한지 한 글자씩 대조하세요.
   - synced_options_text가 원본 options_text와 동일한지 한 글자씩 대조하세요.
   - 만약 원본과 다른 부분이 있다면, 그것이 서술형 동기화를 위한 내용어 교체인지 확인하세요.
   - 서술형 동기화가 아닌 임의 변경이 있다면, 즉시 원본 텍스트로 복원하세요!

2. 기호 불일치 검증: 문제지 발문에 나타난 기호(예: ⓐ, ⓑ, (A), (a)____ 등)가 변형된 "지문 본문"에도 100% 동일한 기호로, 적절한 위치에 존재하는지 확인하세요.

3. 어휘 난이도 [${difficulty}] 심층 검증: 중등 수준에서 'fortnight' 같은 어려운 단어를 하나라도 썼다면 즉시 'two weeks' 등 가장 쉬운 기초 단어로 교체하세요.

4. 의도적 문법 오류(함정) 명백성 보장 (매우 중요): 원본의 어법 오답 구간을 단순히 올바른 문장으로 써놓고 문법적으로 틀렸다고 우기는지 확인하세요. 만약 그렇다면 해당 부분을 'is happened'처럼 누가 봐도 명백하게 비문법적으로 틀린 구문으로 다시 작성하세요.

5. 객관식 일치/불일치 정답 누락 방지.

6. 가독성(줄바꿈) 검증.

[출력 형식 — 반드시 이 구조의 JSON을 출력할 것]
{
  "thought_process": {
    "question_preservation_check": "synced_question_text를 원본과 글자 단위로 대조한 결과: (차이점이 있으면 구체적으로 명시, 없으면 '완벽 일치')",
    "options_preservation_check": "synced_options_text를 원본과 글자 단위로 대조한 결과: (차이점이 있으면 구체적으로 명시, 없으면 '완벽 일치')",
    "grammar_error_enforcement": "원본 어법 함정을 변형 지문에서 명백하게 문법이 틀린 형태로 강제 파괴했는가?",
    "vocabulary_level_check": "지정된 난이도에 맞는 어휘만 사용했는가?"
  },
  "transformed_passage": "변형된 지문 본문만 (문제/보기 포함 금지)",
  "synced_question_text": "원본 문제와 100% 동일 (서술형 동기화 내용어 교체만 허용)",
  "synced_options_text": "원본 보기/선지와 100% 동일 (서술형 동기화 내용어 교체만 허용)",
  "variation_notes": "🔍 변형 해설",
  "answer_explanation": "💡 [정답 및 해설]"
}`;

  const verificationMessages = [
    { role: "system", content: verificationPrompt },
    { role: "user", content: `[1차 생성 결과물]\n${firstPassContent}\n\n이 결과물을 위 체크리스트에 따라 완벽하게 수정한 최종본을 출력해주세요.` }
  ];

  const verificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: verificationMessages,
      response_format: { type: "json_object" }
    })
  });

  if (!verificationResponse.ok) {
    const err = await verificationResponse.json();
    throw new Error(err.error?.message || "지문 변형 API 2차(검증) 호출에 실패했습니다.");
  }

  const verifiedData = await verificationResponse.json();
  const finalContent = JSON.parse(verifiedData.choices[0].message.content);

  // --- 코드에서 최종 결과 조합 (문제/보기 원본 보존 보장) ---
  const passage = finalContent.transformed_passage || "";
  // 서술형 동기화가 적용된 문제/보기를 사용하되, 없으면 원본으로 폴백
  const questionText = finalContent.synced_question_text || extractedData.question_text;
  const optionsText = finalContent.synced_options_text || extractedData.options_text;
  const variationNotes = finalContent.variation_notes || "";
  const answerExplanation = finalContent.answer_explanation || "";

  // 최종 결과 문자열 조합
  const parts = [];
  if (questionText) parts.push(questionText);
  if (passage) parts.push(passage);
  if (optionsText) parts.push(optionsText);
  if (variationNotes) parts.push("---\n" + variationNotes);
  if (answerExplanation) parts.push("---\n" + answerExplanation);

  return parts.join("\n\n");
}
