/**
 * 문제 유형 중앙 레지스트리
 * 새 유형을 추가하려면 이 배열에 항목을 추가하기만 하면 됩니다.
 */

// --- 예시 텍스트 ---

const EXAMPLE_WORD_MATCHING = `5. 다음 중 단어와 영영풀이가 모두 올바르게 연결되어 있는 것은? [2.9점]

  ㉠ slogan    ㉡ wild    ㉢ skin    ㉣ report

  ⓐ natural conditions, where animals and plants are not taken care of by people
  ⓑ a short phrase that is easy to remember
  ⓒ a written or spoken account that gives information about something
  ⓓ the outer covering of a person's or animal's body

  ① ㉠-ⓐ, ㉡-ⓑ, ㉢-ⓒ, ㉣-ⓓ
  ② ㉠-ⓑ, ㉡-ⓐ, ㉢-ⓓ, ㉣-ⓒ  ← 정답
  ③ ㉠-ⓑ, ㉡-ⓐ, ㉢-ⓒ, ㉣-ⓓ
  ④ ㉠-ⓒ, ㉡-ⓓ, ㉢-ⓐ, ㉣-ⓑ`;

const EXAMPLE_BLANK_MATCHING = `23. 빈칸에 들어갈 단어의 영영 풀이를 <보기>에서 순서대로 바르게 짝지은 것은?

  ○ How long can you (A) on one leg?
  ○ May I (B) a white wine with this dish?
  ○ The answer to the question might (C) unclear after the discussion.
  ○ She will (D) him with a delicious homemade cake for his birthday.

  <보기>
  ㉠ to change from a solid to a liquid by applying heat
  ㉡ to tell someone your ideas about what they should do
  ㉢ to be in a steady position without falling to one side
  ㉣ to continue to exist or be left after others have gone
  ㉤ to cause someone to feel mild astonishment or shock
  ㉥ to put it in a position where other people can see a part of your body

        (A)  (B)  (C)  (D)
  ① ㉢  ㉣  ㉡  ㉥
  ② ㉡  ㉢  ㉥  ㉣
  ③ ㉢  ㉡  ㉣  ㉤  ← 정답
  ④ ㉢  ㉥  ㉡  ㉤
  ⑤ ㉥  ㉠  ㉤  ㉢`;

const EXAMPLE_SINGLE_BLANK = `3. 다음 빈칸에 들어갈 단어의 영영풀이로 가장 적절한 것은?

  The criminal changed his name to _______ the identity.

  ① have room or capacity for
  ② hide or keep hidden from sight  ← 정답
  ③ cause to be unhappy or dejected
  ④ make separate things work together
  ⑤ cause painful or uncomfortable reaction`;

// 단어 기반 (TypeB) 문제 유형들
export const VOCAB_TYPES = [
  {
    id: 'word_matching',
    name: '단어-영영풀이 매칭',
    desc: '주어진 단어와 영영풀이를 올바르게 연결하는 문제 (AI 미사용, 즉시 생성)',
    defaultCount: 1,
    enabled: true,
    minWords: 4,
    example: EXAMPLE_WORD_MATCHING,
    exampleImage: import.meta.env.BASE_URL + 'check/1.png',
  },
  {
    id: 'blank_matching',
    name: '빈칸 영영풀이 매칭',
    desc: '예문 빈칸에 단어를 넣고 영영풀이와 매칭 (AI 예문 생성)',
    defaultCount: 1,
    enabled: true,
    minWords: 6,
    example: EXAMPLE_BLANK_MATCHING,
    exampleImage: import.meta.env.BASE_URL + 'check/2.png',
  },
  {
    id: 'single_blank',
    name: '단일 빈칸 영영풀이',
    desc: '하나의 문장에 빈칸을 넣고, 영영풀이 5지선다로 정답 선택 (AI 예문 생성)',
    defaultCount: 1,
    enabled: true,
    minWords: 5,
    example: EXAMPLE_SINGLE_BLANK,
    exampleImage: import.meta.env.BASE_URL + 'check/3.png',
  },
];

// 지문 기반 (TypeA) 문제 유형들
export const PASSAGE_TYPES = [
  {
    id: 'passage_matching',
    name: '지문 영영풀이 매칭',
    desc: '지문 내 단어의 영영풀이를 매칭',
    defaultCount: 1,
    enabled: true,
    minWords: 5,
    example: null,
  },
];

/** 유형 목록에서 초기 typeCounts 객체를 생성합니다 */
export function getDefaultTypeCounts(types) {
  const counts = {};
  types.forEach(t => { counts[t.id] = t.defaultCount; });
  return counts;
}

/** 유형 ID로 유형 정보를 조회합니다 */
export function getTypeById(typeId) {
  return [...VOCAB_TYPES, ...PASSAGE_TYPES].find(t => t.id === typeId) || null;
}
