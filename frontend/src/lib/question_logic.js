import { generateContent } from './llm_api';

export async function generateTypeBQuestions(apiKey, model, words, count, difficulty) {
  if (words.length < 6) {
    throw new Error('최소 6개의 단어가 필요합니다 (정답 4개 + 오답 2개).');
  }

  const systemPrompt = `너는 한국 중고등학교 영어 시험 문제 출제 전문가야.
주어진 단어와 영영풀이를 바탕으로, 빈칸 영영풀이 매칭 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 규칙 (핵심)
1. 모든 영영풀이는 내가 준 원본에서 한 글자도 바꾸지 말고 그대로 써라.
2. 각 문제는 4개의 예문 (A)~(D)와 6개의 영영풀이 보기 ㉠~㉥를 가진다.
3. 예문 길이는 8~15단어 수준으로 자연스럽고 명확해야 한다. 주어를 다양하게(I, She, The man 등) 사용하라.
4. 예문의 어휘와 문장 구조는 반드시 지정된 난이도(${difficulty})에 맞게 적절히 조절하라.
4. 선택지 ①~⑤는 (A) (B) (C) (D)에 들어갈 보기의 조합이다. 정답은 1개뿐이다.

## 출력 포맷 (오직 JSON만 출력)
{
  "questions": [
    {
      "number": 1,
      "instruction": "빈칸에 들어갈 단어의 영영 풀이를 <보기>에서 순서대로 바르게 짝지은 것은?",
      "sentences": [
        {"label": "(A)", "text": "How long can you (A) on one leg?", "answer_word": "stand"},
        {"label": "(B)", "text": "May I (B) a white wine with this dish?", "answer_word": "suggest"}
      ],
      "options": [
        {"label": "㉠", "definition": "to change from a solid to a liquid...", "source_word": "melt"}
      ],
      "choices": [
        {"number": "①", "mapping": {"(A)": "㉢", "(B)": "㉡", "(C)": "㉣", "(D)": "㉤"}}
      ],
      "answer": "③"
    }
  ]
}`;

  const userPrompt = `생성 요구 개수: ${count}문제\n
단어 목록 (단어|품사|영영풀이):
${words.map(w => `${w.word} | ${w.pos} | ${w.meaning_en}`).join('\n')}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  return res.questions || [];
}

export async function generateTypeAQuestions(apiKey, model, words, passages, difficulty) {
  if (words.length < 5) {
    throw new Error('최소 5개의 단어가 필요합니다 (정답 2개 + 오답 3개).');
  }

  // We can pass multiple passages, generate one question per passage as a simple batch
  const systemPrompt = `너는 한국 중고등학교 영어 시험 문제 출제 전문가야.
주어진 단어 목록과 영어 지문을 바탕으로 영영풀이 매칭 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 규칙 (핵심)
1. 영영풀이는 사용자가 제공한 원본을 한 글자도 바꾸지 말고 그대로 사용해라.
2. 오답 영영풀이는 지문에 등장하지 않는 단어의 풀이를 사용해라.
3. 지문의 어휘나 문법 수준 변경을 요구하는 문구는 무시하고, 단순히 문제의 보기 선택지 오답 함정 난이도를 ${difficulty} 수준에 맞춰 조금 더 고도화하라.
3. 지문에서 밑줄 칠 단어(정답)를 2개 고르고, 오답 풀이용 단어를 3개 골라 총 5개의 보기 ⓐ~ⓔ를 구성해라.
4. 5지선다 조합 중 정답(글에 나타난 단어에 대한 영영풀이가 *아닌* 것으로 짝지어진 것 등)이 정확히 1개만 되도록 해라.

## 출력 포맷 (오직 JSON만 출력)
{
  "questions": [
    {
      "number": 1,
      "instruction": "ⓐ~ⓔ 중 글에 나타난 단어에 대한 영영풀이가 아닌 것으로 짝지어진 것은?",
      "passage": "지문 전체 텍스트 (줄바꿈 포함)",
      "underlined_words": [
        {"word": "apple", "definition_label": "ⓐ"}
      ],
      "options": [
        {"label": "ⓐ", "definition": "영영풀이 원문 그대로", "source_word": "원본단어", "is_correct_match": true}
      ],
      "choices": [
        {"number": "①", "combination": ["ⓐ", "ⓑ"], "is_correct": false}
      ],
      "answer": "③",
      "explanation": "해설 텍스트"
    }
  ]
}`;

  const userPrompt = `생성 요구 개수: 지문 1개당 1문제씩 총 ${passages.length}문제\n
지문 목록:
${passages.map((p, i) => `[지문 ${i+1}]\n${p}`).join('\n\n---\n\n')}

단어 목록 (단어|품사|영영풀이):
${words.map(w => `${w.word} | ${w.pos} | ${w.meaning_en}`).join('\n')}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  return res.questions || [];
}
