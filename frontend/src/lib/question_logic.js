import { generateContent } from './llm_api';

/* ────────────────────────────────────────────────
   유틸리티
   ──────────────────────────────────────────────── */

/** Fisher-Yates 셔플 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 배열에서 랜덤 n개를 뽑는다 */
function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

const LABELS_5 = ['㉠', '㉡', '㉢', '㉣', '㉤'];
const DEF_LABELS_5 = ['ⓐ', 'ⓑ', 'ⓒ', 'ⓓ', 'ⓔ'];
const CHOICE_NUMS_5 = ['①', '②', '③', '④', '⑤'];

/* ────────────────────────────────────────────────
   Type 1: 단어-영영풀이 직접 매칭 (로컬, AI 미사용)
   - 단어 5개 + 영영풀이 5개, 5지선다
   ──────────────────────────────────────────────── */

export function generateType1Questions(words, count) {
  if (words.length < 5) {
    throw new Error('이 유형은 최소 5개의 단어가 필요합니다.');
  }

  const questions = [];

  for (let q = 0; q < count; q++) {
    const selected = pickRandom(words, 5);

    // 정답 매핑: ㉠→ⓐ, ㉡→ⓑ, ...
    const correctMapping = {};
    selected.forEach((w, i) => {
      correctMapping[LABELS_5[i]] = DEF_LABELS_5[i];
    });

    // 보기(영영풀이) - 순서를 셔플하여 ⓐ~ⓔ에 배정
    const shuffledDefs = shuffle(selected.map((w, i) => ({
      originalIdx: i,
      word: w.word,
      meaning_en: w.meaning_en,
    })));

    const wordLabels = selected.map((w, i) => ({
      label: LABELS_5[i],
      word: w.word,
    }));

    const defLabels = shuffledDefs.map((d, i) => ({
      label: DEF_LABELS_5[i],
      definition: d.meaning_en,
      source_word: d.word,
    }));

    // 정답 매핑 계산
    const answerMap = {};
    selected.forEach((w, i) => {
      const defIdx = shuffledDefs.findIndex(d => d.word === w.word);
      answerMap[LABELS_5[i]] = DEF_LABELS_5[defIdx];
    });

    // 5지선다 생성 (정답 1개 + 오답 4개)
    const choices = [];
    const answerStr = LABELS_5.map(l => `${l}-${answerMap[l]}`).join(', ');

    // 정답을 랜덤 위치에 삽입
    const answerPos = Math.floor(Math.random() * 5);

    // 오답 매핑 생성: DEF_LABELS_5의 순열 중 정답과 다른 것
    const otherPerms = generateDistinctPermutations(DEF_LABELS_5, answerMap, LABELS_5, 4);

    for (let i = 0, wrongIdx = 0; i < 5; i++) {
      if (i === answerPos) {
        choices.push({
          number: CHOICE_NUMS_5[i],
          mapping: { ...answerMap },
          isCorrect: true,
        });
      } else {
        choices.push({
          number: CHOICE_NUMS_5[i],
          mapping: otherPerms[wrongIdx],
          isCorrect: false,
        });
        wrongIdx++;
      }
    }

    questions.push({
      number: q + 1,
      typeId: 'word_matching',
      type: 'TypeB',
      instruction: '다음 중 단어와 영영풀이가 모두 올바르게 연결되어 있는 것은?',
      wordLabels,
      defLabels,
      choices,
      answer: CHOICE_NUMS_5[answerPos],
    });
  }

  return questions;
}

/** 정답과 다른 순열을 n개 생성 */
function generateDistinctPermutations(labels, answerMap, wordLabels, n) {
  const perms = [];
  let attempts = 0;
  while (perms.length < n && attempts < 100) {
    attempts++;
    const shuffled = shuffle(labels);
    const mapping = {};
    wordLabels.forEach((wl, i) => { mapping[wl] = shuffled[i]; });

    // 정답과 동일한지 확인
    const isSame = wordLabels.every(wl => mapping[wl] === answerMap[wl]);
    if (isSame) continue;

    // 이미 생성된 것과 동일한지 확인
    const isDuplicate = perms.some(p =>
      wordLabels.every(wl => p[wl] === mapping[wl])
    );
    if (isDuplicate) continue;

    perms.push(mapping);
  }
  return perms;
}

/* ────────────────────────────────────────────────
   Type 2: 빈칸 영영풀이 매칭 (기존 blank_matching)
   - 예문 4개 + 보기 6개, 5지선다
   ──────────────────────────────────────────────── */

export async function generateType2Questions(apiKey, model, words, count, difficulty) {
  if (words.length < 6) {
    throw new Error('이 유형은 최소 6개의 단어가 필요합니다 (정답 4개 + 오답 2개).');
  }

  const systemPrompt = `너는 한국 중고등학교 영어 시험 문제 출제 전문가야.
주어진 단어와 영영풀이를 바탕으로, 빈칸 영영풀이 매칭 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 규칙 (핵심 - 반드시 지켜라)
1. 모든 영영풀이는 내가 준 원본에서 한 글자도 바꾸지 말고 그대로 써라.
2. 각 문제는 반드시 정확히 4개의 예문 (A), (B), (C), (D)를 포함해야 한다. 절대로 1~3개만 만들지 마라.
3. 각 문제는 반드시 정확히 6개의 영영풀이 보기 ㉠, ㉡, ㉢, ㉣, ㉤, ㉥를 포함해야 한다. (4개의 정답 + 2개의 오답)
4. 예문 길이는 8~15단어 수준으로 자연스럽고 명확해야 한다. 주어를 다양하게(I, She, The man 등) 사용하라.
5. 예문의 어휘와 문장 구조는 반드시 지정된 난이도(${difficulty})에 맞게 적절히 조절하라.
6. 선택지는 반드시 5개 ①~⑤이며, 각 선택지는 (A)(B)(C)(D)에 들어갈 보기 ㉠~㉥의 조합이다. 정답은 1개뿐이다.
7. 각 문제에서 사용하는 단어들이 최대한 중복되지 않도록 다양한 단어를 사용하라.

## 출력 포맷 (오직 JSON만 출력) — sentences는 반드시 4개, options는 반드시 6개
{
  "questions": [
    {
      "number": 1,
      "instruction": "빈칸에 들어갈 단어의 영영 풀이를 <보기>에서 순서대로 바르게 짝지은 것은?",
      "sentences": [
        {"label": "(A)", "text": "How long can you (A) on one leg?", "answer_word": "stand"},
        {"label": "(B)", "text": "May I (B) a white wine with this dish?", "answer_word": "suggest"},
        {"label": "(C)", "text": "The answer might (C) unclear after the meeting.", "answer_word": "remain"},
        {"label": "(D)", "text": "She will (D) him with a cake for his birthday.", "answer_word": "surprise"}
      ],
      "options": [
        {"label": "㉠", "definition": "to change from a solid to a liquid by applying heat", "source_word": "melt"},
        {"label": "㉡", "definition": "to tell someone your ideas about what they should do", "source_word": "suggest"},
        {"label": "㉢", "definition": "to be in a steady position without falling to one side", "source_word": "stand"},
        {"label": "㉣", "definition": "to continue to exist or be left after others have gone", "source_word": "remain"},
        {"label": "㉤", "definition": "to cause someone to feel mild astonishment or shock", "source_word": "surprise"},
        {"label": "㉥", "definition": "to put it in a position where other people can see", "source_word": "display"}
      ],
      "choices": [
        {"number": "①", "mapping": {"(A)": "㉢", "(B)": "㉣", "(C)": "㉡", "(D)": "㉥"}},
        {"number": "②", "mapping": {"(A)": "㉡", "(B)": "㉢", "(C)": "㉥", "(D)": "㉣"}},
        {"number": "③", "mapping": {"(A)": "㉢", "(B)": "㉡", "(C)": "㉣", "(D)": "㉤"}},
        {"number": "④", "mapping": {"(A)": "㉢", "(B)": "㉥", "(C)": "㉡", "(D)": "㉤"}},
        {"number": "⑤", "mapping": {"(A)": "㉥", "(B)": "㉠", "(C)": "㉤", "(D)": "㉢"}}
      ],
      "answer": "③"
    }
  ]
}`;

  const userPrompt = `생성 요구 개수: ${count}문제

⚠️ 중요: 각 문제마다 반드시 sentences 4개, options 6개, choices 5개를 포함해야 합니다.

단어 목록 (단어|영영풀이):
${words.map(w => `${w.word} | ${w.meaning_en}`).join('\n')}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  const questions = (res.questions || []).map(q => ({
    ...q,
    typeId: 'blank_matching',
    type: 'TypeB',
  }));
  return questions;
}

/* ────────────────────────────────────────────────
   Type 3: 단일 빈칸 영영풀이 5지선다
   - 문장 1개 빈칸 + 5지선다
   ──────────────────────────────────────────────── */

export async function generateType3Questions(apiKey, model, words, count, difficulty) {
  if (words.length < 5) {
    throw new Error('이 유형은 최소 5개의 단어가 필요합니다 (정답 1개 + 오답 4개).');
  }

  const systemPrompt = `너는 한국 중고등학교 영어 시험 문제 출제 전문가야.
주어진 단어와 영영풀이를 바탕으로, 빈칸 영영풀이 5지선다 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 규칙 (핵심)
1. 각 문제마다 단어 1개를 정답으로 선택하고, 해당 단어가 자연스럽게 빈칸에 들어갈 8~15단어 길이의 예문을 1개 생성하라.
2. 예문의 어휘와 문장 구조는 반드시 지정된 난이도(${difficulty})에 맞게 적절히 조절하라.
3. 보기는 영영풀이 5개 (정답 1개 + 오답 4개)로 구성한다.
4. 모든 영영풀이는 내가 준 원본에서 한 글자도 바꾸지 말고 그대로 써라.
5. 오답 영영풀이는 같은 단어 목록의 다른 단어 풀이에서 가져오되, 정답과 혼동될 수 있는 것을 우선 배치해라.
6. 각 문제에서 사용하는 정답 단어가 최대한 중복되지 않도록 다양한 단어를 사용하라.

## 출력 포맷 (오직 JSON만 출력)
{
  "questions": [
    {
      "number": 1,
      "instruction": "다음 빈칸에 들어갈 단어의 영영풀이로 가장 적절한 것은?",
      "sentence": "The criminal changed his name to _______ the identity.",
      "answer_word": "conceal",
      "choices": [
        {"number": "①", "definition": "have room or capacity for", "source_word": "accommodate", "is_correct": false},
        {"number": "②", "definition": "hide or keep hidden from sight", "source_word": "conceal", "is_correct": true},
        {"number": "③", "definition": "cause to be unhappy or dejected", "source_word": "depress", "is_correct": false},
        {"number": "④", "definition": "make separate things work together", "source_word": "coordinate", "is_correct": false},
        {"number": "⑤", "definition": "cause painful or uncomfortable reaction", "source_word": "irritate", "is_correct": false}
      ],
      "answer": "②"
    }
  ]
}`;

  const userPrompt = `생성 요구 개수: ${count}문제\n
단어 목록 (단어|영영풀이):
${words.map(w => `${w.word} | ${w.meaning_en}`).join('\n')}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  const questions = (res.questions || []).map(q => ({
    ...q,
    typeId: 'single_blank',
    type: 'TypeB',
  }));
  return questions;
}

/* ────────────────────────────────────────────────
   오케스트레이터: 유형별 순차 생성
   - onProgress 콜백으로 진행 상태를 UI에 전달
   ──────────────────────────────────────────────── */

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {Array} words - 파싱된 단어 배열
 * @param {Object} typeCounts - { word_matching: 2, blank_matching: 3, single_blank: 2 }
 * @param {string} difficulty
 * @param {Function} onProgress - (status: { phase, completedTypes, totalTypes, currentType }) => void
 * @returns {Promise<Array>} 모든 유형의 문제를 합친 배열
 */
export async function generateAllQuestions(apiKey, model, words, typeCounts, difficulty, onProgress) {
  const allQuestions = [];
  const typeOrder = ['word_matching', 'blank_matching', 'single_blank'];
  const typeNames = {
    word_matching: '단어-영영풀이 매칭',
    blank_matching: '빈칸 영영풀이 매칭',
    single_blank: '단일 빈칸 영영풀이',
  };

  const activeCounts = typeOrder.filter(t => (typeCounts[t] || 0) > 0);
  const totalTypes = activeCounts.length;
  let completedTypes = 0;

  for (const typeId of typeOrder) {
    const count = typeCounts[typeId] || 0;
    if (count === 0) continue;

    onProgress?.({
      phase: 'generating',
      completedTypes,
      totalTypes,
      currentType: typeNames[typeId],
    });

    let generated = [];

    switch (typeId) {
      case 'word_matching':
        generated = generateType1Questions(words, count);
        break;
      case 'blank_matching':
        generated = await generateType2Questions(apiKey, model, words, count, difficulty);
        break;
      case 'single_blank':
        generated = await generateType3Questions(apiKey, model, words, count, difficulty);
        break;
      default:
        break;
    }

    allQuestions.push(...generated);
    completedTypes++;
  }

  // 전체 번호 재부여
  allQuestions.forEach((q, i) => { q.number = i + 1; });

  onProgress?.({
    phase: 'done',
    completedTypes: totalTypes,
    totalTypes,
    currentType: null,
  });

  return allQuestions;
}

/* ────────────────────────────────────────────────
   기존 호환성: TypeA (지문 기반) 유지
   ──────────────────────────────────────────────── */

export async function generateTypeAQuestions(apiKey, model, words, passages, difficulty, count = 1) {
  if (words.length < 5) {
    throw new Error('최소 5개의 단어가 필요합니다 (정답 2개 + 오답 3개).');
  }

  const systemPrompt = `너는 한국 중고등학교 영어 시험 문제 출제 전문가야.
주어진 단어 목록과 영어 지문을 바탕으로 영영풀이 매칭 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 규칙 (핵심)
1. 영영풀이는 사용자가 제공한 원본을 한 글자도 바꾸지 말고 그대로 사용해라.
2. 오답 영영풀이는 지문에 등장하지 않는 단어의 풀이를 사용해라.
3. 지문의 어휘나 문법 수준 변경을 요구하는 문구는 무시하고, 단순히 문제의 보기 선택지 오답 함정 난이도를 ${difficulty} 수준에 맞춰 조금 더 고도화하라.
4. 지문에서 밑줄 칠 단어(정답)를 2개 고르고, 오답 풀이용 단어를 3개 골라 총 5개의 보기 ⓐ~ⓔ를 구성해라.
5. 5지선다 조합 중 정답(글에 나타난 단어에 대한 영영풀이가 *아닌* 것으로 짝지어진 것 등)이 정확히 1개만 되도록 해라.
6. 복수의 문제를 생성할 경우, 서로 다른 단어들을 정답과 오답으로 활용하여 다양한 문제가 나오도록 하라.

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

  const userPrompt = `생성 요구 개수: 총 ${count}문제\n
지문 목록:
${passages.map((p, i) => `[지문 ${i+1}]\n${p}`).join('\n\n---\n\n')}

단어 목록 (단어|영영풀이):
${words.map(w => `${w.word} | ${w.meaning_en}`).join('\n')}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  return res.questions || [];
}

/* ────────────────────────────────────────────────
   Reading O/X: 지문 일치/불일치 문제
   - 지문을 읽고 5개 보기의 O/X 조합을 고르는 5지선다
   ──────────────────────────────────────────────── */

export async function generateReadingOXQuestions(apiKey, model, passage, count, difficulty) {
  if (!passage || passage.trim().length < 30) {
    throw new Error('지문이 너무 짧습니다. 최소 30자 이상의 영어 지문을 입력해주세요.');
  }

  const systemPrompt = `너는 한국 중고등학교 영어 시험 문제 출제 전문가야.
주어진 영어 지문을 바탕으로, 일치/불일치(O/X) 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 규칙 (핵심)
1. 지문의 내용을 바탕으로 5개의 보기 문장(진술문)을 만들어라.
2. 각 보기 문장은 지문의 내용과 일치하면 O, 불일치하면 X로 판정된다.
3. 보기 문장은 지문을 그대로 베끼지 말고 패러프레이즈하라. 학생이 내용을 제대로 이해했는지 확인할 수 있어야 한다.
4. 5개 보기 중 O와 X가 적절히 섞이도록 하라 (전부 O이거나 전부 X이면 안 된다).
5. 선택지 ①~⑤는 5개 보기에 대한 O/X 조합이다. 정답 조합은 1개뿐이다.
6. 각 문제에서 보기 문장의 난이도는 ${difficulty} 수준에 맞춰라.
7. 빈칸이 들어간 보기는 만들지 마라. 모든 보기 문장은 완전한 문장이어야 한다.

## 출력 포맷 (오직 JSON만 출력)
{
  "questions": [
    {
      "number": 1,
      "instruction": "<보기>의 ㉠~㉤이 윗글의 내용과 일치하면 O, 다르면 X라고 표시할 때 순서대로 OX를 배열한 것은?",
      "passage": "지문 전체를 여기에 그대로 복사",
      "statements": [
        {"label": "㉠", "text": "The family's trip to Barcelona went easily without any problems.", "correct_ox": "X"},
        {"label": "㉡", "text": "The family members were satisfied with their first day of the trip.", "correct_ox": "X"},
        {"label": "㉢", "text": "The father was against using smartphones during the trip.", "correct_ox": "O"},
        {"label": "㉣", "text": "Although the family members were tired from getting lost, they decided to go out for dinner.", "correct_ox": "X"},
        {"label": "㉤", "text": "The father suggested the idea of a trip without smartphones because he wanted to learn a new language.", "correct_ox": "X"}
      ],
      "choices": [
        {"number": "①", "combination": ["O", "X", "O", "X", "O"], "is_correct": false},
        {"number": "②", "combination": ["O", "X", "X", "O", "X"], "is_correct": false},
        {"number": "③", "combination": ["X", "O", "O", "X", "X"], "is_correct": false},
        {"number": "④", "combination": ["X", "X", "O", "X", "X"], "is_correct": true},
        {"number": "⑤", "combination": ["X", "X", "O", "X", "O"], "is_correct": false}
      ],
      "answer": "④"
    }
  ]
}`;

  const userPrompt = `생성 요구 개수: ${count}문제

영어 지문:
${passage}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  const questions = (res.questions || []).map(q => ({
    ...q,
    typeId: 'reading_ox',
    type: 'ReadingOX',
  }));
  return questions;
}

/* ────────────────────────────────────────────────
   Reading 일치 짝짓기: 지문 내용 일치 진술 짝 고르기
   - 지문을 읽고 7개 진술(ⓐ~ⓖ) 중 "알 수 있는 것"끼리 짝지은 선택지를 고르는 5지선다
   - AI는 7개 진술 + 정확히 2개 참(is_correct)만 생성하고,
     선택지(짝) 조합과 정답은 JS에서 결정적으로 구성한다.
   ──────────────────────────────────────────────── */

const LABELS_7 = ['ⓐ', 'ⓑ', 'ⓒ', 'ⓓ', 'ⓔ', 'ⓕ', 'ⓖ'];

/** 정확히 2개의 참 진술을 정답 짝으로, 나머지는 오답 짝으로 구성한 5지선다를 생성 */
function buildMatchChoices(rawStatements, passage, number) {
  // 라벨을 ⓐ~ⓖ 순서대로 강제 부여 (AI가 라벨을 잘못 달아도 무시)
  const statements = (rawStatements || []).slice(0, 7).map((s, i) => ({
    label: LABELS_7[i],
    text: (s.text || '').trim(),
    is_correct: !!s.is_correct,
  }));

  if (statements.length !== 7) {
    throw new Error('AI가 7개의 보기 진술을 생성하지 못했습니다. 다시 시도해주세요.');
  }

  const correctLabels = statements.filter(s => s.is_correct).map(s => s.label);
  if (correctLabels.length !== 2) {
    throw new Error('AI가 정답 조건(지문으로 알 수 있는 진술 정확히 2개)을 충족하지 못했습니다. 다시 시도해주세요.');
  }

  const correctPair = [correctLabels[0], correctLabels[1]];
  const pairKey = (p) => [...p].sort().join('');
  const correctKey = pairKey(correctPair);

  // 7개 라벨로 만들 수 있는 모든 짝(21개) 중, 정답 짝을 제외한 것이 모두 오답 짝
  // (정답 짝이 아닌 짝은 반드시 거짓 진술을 1개 이상 포함하므로 안전한 오답이다)
  const distractorPool = [];
  for (let i = 0; i < LABELS_7.length; i++) {
    for (let j = i + 1; j < LABELS_7.length; j++) {
      const pair = [LABELS_7[i], LABELS_7[j]];
      if (pairKey(pair) !== correctKey) distractorPool.push(pair);
    }
  }

  const distractors = pickRandom(distractorPool, 4);

  // 정답 짝 + 오답 4개를 섞어 ①~⑤에 배정
  const mixed = shuffle([{ pair: correctPair, is_correct: true }, ...distractors.map(p => ({ pair: p, is_correct: false }))]);

  const choices = mixed.map((c, i) => ({
    number: CHOICE_NUMS_5[i],
    pair: [...c.pair].sort((a, b) => LABELS_7.indexOf(a) - LABELS_7.indexOf(b)),
    is_correct: c.is_correct,
  }));

  const answer = choices.find(c => c.is_correct).number;

  return {
    number,
    typeId: 'reading_match',
    type: 'ReadingMatch',
    instruction: '<보기>의 ⓐ~ⓖ 중 윗글의 내용을 통해 알 수 있는 것끼리 짝지어진 것은?',
    passage,
    statements,
    choices,
    answer,
  };
}

export async function generateReadingMatchQuestions(apiKey, model, passage, count, difficulty) {
  if (!passage || passage.trim().length < 30) {
    throw new Error('지문이 너무 짧습니다. 최소 30자 이상의 영어 지문을 입력해주세요.');
  }

  const systemPrompt = `너는 한국 중고등학교 영어 내신 시험 출제 전문가야.
주어진 영어 지문을 바탕으로, "윗글의 내용을 통해 알 수 있는 것끼리 짝지어진 것"을 고르는 일치 짝짓기 문제를 출제해.
목표 난이도는 [${difficulty}] 수준이다.

## 문제 구조
- <보기>에는 지문에 관한 7개의 영어 진술문이 들어간다. (라벨/번호는 시스템이 부여하므로 너는 순서대로 7개만 작성)
- 이 중 정확히 2개만 지문의 내용을 통해 "알 수 있는(일치하는)" 참인 진술이어야 한다 → is_correct: true
- 나머지 5개는 지문만으로는 "알 수 없거나 사실과 다른" 거짓 진술이어야 한다 → is_correct: false
- 학생은 참인 진술 2개가 짝지어진 선택지를 정답으로 고르게 된다. (선택지 조합은 시스템이 만든다)

## 진술문 작성 규칙 (핵심 — 반드시 지켜라)
1. 모든 진술문은 영어로 쓰고, 지문 문장을 그대로 베끼지 말고 반드시 패러프레이즈하라.
2. 참(is_correct: true) 진술 2개: 지문에 직접 언급되었거나 명백히 추론 가능한 내용. 단, 어휘·표현은 지문과 다르게 바꿔라.
3. 거짓(is_correct: false) 진술 5개는 아래 함정 유형을 골고루 섞어라:
   - 지문에 없는 정보를 덧붙임 (국적·연도·장소·인물 관계를 잘못 연결)
   - 지문 내용을 과장/일반화 (most, all, always, the first, the only 등)
   - 두 대상의 속성을 서로 뒤바꿈 (A의 특징을 B에 붙이기)
   - 인과 관계나 시간 순서를 왜곡
   - 지문에서 다룬 사실과 정반대로 진술
4. 거짓 진술도 지문을 꼼꼼히 읽지 않은 학생은 헷갈릴 만큼 그럴듯해야 한다. (터무니없이 무관한 내용 금지)
5. 7개 진술의 소재가 지문 전체에 고르게 분포하도록 하라. (특정 한 문단에만 쏠리지 말 것)
6. 각 진술문은 빈칸 없는 완전한 평서문으로, 12~22단어 내외로 작성하라.
7. 정답이 한쪽으로 쏠리지 않도록, 참인 2개 진술을 7개 중 매번 다른 위치에 배치하라.

## 출력 포맷 (오직 JSON만 출력, 그 외 텍스트·코드블록 금지)
- statements는 반드시 정확히 7개, 그 중 is_correct: true는 정확히 2개여야 한다.
{
  "questions": [
    {
      "statements": [
        {"text": "Cubism started in Paris and lasted for less than twenty years.", "is_correct": true},
        {"text": "Most of Rembrandt's paintings show outdoor landscape scenes.", "is_correct": false},
        {"text": "Surrealist painters Salvador Dali and Joan Miro were both from Spain.", "is_correct": true},
        {"text": "Impressionism was popular all over the world until the 1930s.", "is_correct": false},
        {"text": "Post-Impressionist works share the same bright style as Impressionism.", "is_correct": false},
        {"text": "Picasso painted a single subject from only one fixed angle.", "is_correct": false},
        {"text": "Baroque art is described as plain and calm rather than dramatic.", "is_correct": false}
      ]
    }
  ]
}`;

  const userPrompt = `생성 요구 개수: ${count}문제
${count > 1 ? '\n⚠️ 여러 문제를 만들 경우, 문제마다 서로 다른 진술 소재와 다른 정답 조합이 나오도록 다양하게 구성하라.\n' : ''}
영어 지문:
${passage}`;

  const res = await generateContent(apiKey, model, systemPrompt, userPrompt);
  const questions = (res.questions || []).map((q, i) => buildMatchChoices(q.statements, passage, i + 1));
  return questions;
}
