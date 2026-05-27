/**
 * 문법 기출문제 샘플 데이터
 * 
 * 기존 DB JSON에서 [어법] 유형 문제를 추출하고,
 * grammar_category 필드를 추가하여 카테고리별 분류
 * 
 * 향후: PDF/텍스트 입력 → 자동 아카이빙 기능으로 데이터 추가
 */

const grammarQuestions = [
  {
    id: 'gq-001',
    categoryId: 'middle-1-grammar-1-2',
    subType: '문장형',
    question: '14. 다음 글의 밑줄 친 부분 중, 어법상 어색한 것은?',
    passage:
      'How did the human mind evolve? One possibility is that competition and conflicts with other human tribes caused our brains to evolve the way they ⓐ<u>were</u>. A human tribe that could out-think its enemies, even slightly, possessed a vital advantage. The ability of your tribe to imagine and ⓑ<u>predict</u> where and when a hostile enemy tribe might strike, and plan accordingly, gives your tribe a significant military advantage. The human mind became a weapon in the struggle for survival, a weapon far more ⓒ<u>decisive</u> than any before it. And this mental advantage ⓓ<u>was applied</u>, over and over, within each succeeding generation. The tribe that could out-think its opponents was more likely to succeed in battle and would then pass on the genes responsible for this mental advantage to ⓔ<u>its</u> offspring. You and I are the descendants of the winners.',
    options: ['① ⓐ', '② ⓑ', '③ ⓒ', '④ ⓓ', '⑤ ⓔ'],
    answer: '①',
    explanation:
      'ⓐ의 were는 앞의 일반동사 evolve를 대신하는 대동사 자리이므로 did로 고쳐야 적절합니다. the way they did(그것들이 진화했던 방식)으로 해석됩니다.',
    difficulty: '중',
    source: '2024년 고1 1학기 기말 경혜여자고등학교',
    sourceIndex: '[24년 6월 33번]',
    grade: '고1',
    tags: ['대동사', '일반동사', 'did vs were'],
  },
  {
    id: 'gq-002',
    categoryId: 'middle-1-grammar-1-2',
    subType: '문장형',
    question:
      '30. 윗글의 밑줄 친 ⓐ~ⓔ 중에서 어법상 어색한 것은?',
    passage:
      'Norms are everywhere, defining ⓐ<u>what</u> is "normal" and guiding our interpretations of social life at every turn. As a simple example, there is a norm in Anglo society to say Thank you to strangers who have just done something to help, such as open a door for you, ⓑ<u>points</u> out that you\'ve just dropped something, or give you directions.',
    options: ['① ⓐ', '② ⓑ', '③ ⓒ', '④ ⓓ', '⑤ ⓔ'],
    answer: '②',
    explanation:
      'ⓑ가 포함된 문장에서 help는 준사역동사로 목적격 보어로 동사원형이나 to부정사를 취합니다. 여기서는 help의 목적격 보어로 \'open a door\', \'point out\', \'give you directions\'가 병렬 구조로 연결되어야 하므로 \'points\'는 원형인 \'point\'가 되어야 적절합니다.',
    difficulty: '하',
    source: '2024년 고1 1학기 기말 경희고등학교',
    sourceIndex: '[24년 3월 41-42번]',
    grade: '고1',
    tags: ['병렬구조', '동사원형', '준사역동사'],
  },
  {
    id: 'gq-003',
    categoryId: 'middle-1-grammar-1-1',
    subType: '문장형',
    question: '다음 중 밑줄 친 be동사의 쓰임이 어법상 어색한 것은?',
    passage: null,
    options: [
      '① She <u>is</u> a great singer.',
      '② They <u>are</u> happy with the result.',
      '③ He <u>are</u> my best friend.',
      '④ We <u>are</u> going to the park.',
      '⑤ I <u>am</u> ready for the test.',
    ],
    answer: '③',
    explanation:
      '주어 He는 3인칭 단수이므로 be동사는 is를 사용해야 합니다. are는 복수 주어(we, they, you)와 함께 사용합니다.',
    difficulty: '하',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['be동사', '주어-동사 수일치'],
  },
  {
    id: 'gq-004',
    categoryId: 'middle-1-grammar-3-3',
    subType: '문장형',
    question: '다음 빈칸에 들어갈 조동사로 가장 적절한 것은?',
    passage:
      'A: Can I go out and play?\nB: It _______ rain later. Take your umbrella just in case.',
    options: ['① can', '② will', '③ may', '④ must', '⑤ should'],
    answer: '③',
    explanation:
      'may는 추측(~일지도 모른다)을 나타내는 조동사로, "나중에 비가 올지도 몰라"라는 불확실한 추측에 적합합니다.',
    difficulty: '하',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['may', '추측', '조동사'],
  },
  {
    id: 'gq-005',
    categoryId: 'middle-1-grammar-3-3',
    subType: '서술형',
    question:
      '다음 우리말에 맞게 주어진 단어를 활용하여 문장을 완성하시오.',
    passage:
      '그녀는 파티에 올지도 모른다.\nShe _________________________ to the party. (may, come)',
    options: [],
    answer: 'may come',
    explanation:
      '"~일지도 모른다"는 조동사 may를 사용하여 표현합니다. may 뒤에는 동사원형이 옵니다.',
    difficulty: '하',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['may', '서술형', '조동사'],
  },
  {
    id: 'gq-006',
    categoryId: 'middle-1-grammar-4-3',
    subType: '문장형',
    question: '다음 중 현재완료 시제가 올바르게 쓰인 것은?',
    passage: null,
    options: [
      '① I have went to the museum yesterday.',
      '② She has already finished her homework.',
      '③ We have meet him last week.',
      '④ They has lived here for ten years.',
      '⑤ He have been to Japan twice.',
    ],
    answer: '②',
    explanation:
      '현재완료는 have/has + 과거분사 형태입니다. ①은 went→gone, ③은 meet→met, ④는 has→have (주어 They), ⑤는 have→has (주어 He)로 고쳐야 합니다. ②는 has + finished(과거분사)로 올바릅니다.',
    difficulty: '중',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['현재완료', 'have/has + p.p.'],
  },
  {
    id: 'gq-007',
    categoryId: 'middle-1-grammar-5-1',
    subType: '문장형',
    question: '다음 문장을 수동태로 바르게 바꾼 것은?\n\n"The teacher praised the students."',
    passage: null,
    options: [
      '① The students praised by the teacher.',
      '② The students were praised by the teacher.',
      '③ The students was praised by the teacher.',
      '④ The students are praised by the teacher.',
      '⑤ The students be praised by the teacher.',
    ],
    answer: '②',
    explanation:
      '능동태의 목적어(the students)가 수동태의 주어가 되고, 동사는 be + 과거분사 형태입니다. 원문이 과거시제(praised)이므로 were praised가 적절합니다.',
    difficulty: '중',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['수동태', 'be + p.p.', '과거시제'],
  },
  {
    id: 'gq-008',
    categoryId: 'middle-1-grammar-9-1',
    subType: '문장형',
    question: '다음 밑줄 친 to부정사의 용법이 나머지와 다른 하나는?',
    passage: null,
    options: [
      '① I want <u>to be</u> a doctor.',
      '② She decided <u>to study</u> abroad.',
      '③ He went to the store <u>to buy</u> some milk.',
      '④ They hope <u>to travel</u> the world.',
      '⑤ We plan <u>to move</u> next month.',
    ],
    answer: '③',
    explanation:
      '①②④⑤는 동사의 목적어로 쓰인 명사적 용법이고, ③은 "우유를 사기 위해"라는 목적을 나타내는 부사적 용법(목적)입니다.',
    difficulty: '중',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['to부정사', '명사적용법', '부사적용법'],
  },
  {
    id: 'gq-009',
    categoryId: 'middle-1-grammar-13-1',
    subType: '문장형',
    question: '다음 빈칸에 들어갈 접속사로 가장 적절한 것은?',
    passage:
      'I wanted to go to the concert, _______ the tickets were sold out.',
    options: ['① and', '② but', '③ or', '④ so', '⑤ for'],
    answer: '②',
    explanation:
      '앞 문장은 "콘서트에 가고 싶었다", 뒷 문장은 "표가 매진되었다"로 대조/역접의 관계이므로 등위접속사 but이 적절합니다.',
    difficulty: '하',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['등위접속사', 'but', '역접'],
  },
  {
    id: 'gq-010',
    categoryId: 'middle-1-grammar-99-1',
    subType: '문장형',
    question: '다음 빈칸에 들어갈 관계대명사로 가장 적절한 것은?',
    passage:
      'I have a friend _______ speaks five languages.',
    options: ['① which', '② what', '③ who', '④ whom', '⑤ whose'],
    answer: '③',
    explanation:
      '선행사 a friend는 사람이고, 관계절에서 주어 역할을 하므로 관계대명사 who가 적절합니다.',
    difficulty: '하',
    source: '샘플 문제',
    sourceIndex: '',
    grade: '중1',
    tags: ['관계대명사', 'who', '주격'],
  },
];

/**
 * 카테고리 ID로 문제 필터링
 * @param {string[]} categoryIds - 선택된 카테고리 ID 목록
 * @returns {object[]} 필터된 문제 목록
 */
export function getQuestionsByCategories(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return grammarQuestions;

  return grammarQuestions.filter((q) => {
    // 직접 카테고리 매치
    if (categoryIds.includes(q.categoryId)) return true;
    // subType 포함 매치 (예: "middle-1-grammar-3-3__문장형")
    const fullId = `${q.categoryId}__${q.subType}`;
    if (categoryIds.includes(fullId)) return true;
    // 상위 카테고리 매치 (예: "middle-1-grammar" → 해당 문법 모든 문제)
    return categoryIds.some((cid) => q.categoryId.startsWith(cid));
  });
}

/**
 * 난이도별 필터
 */
export function filterByDifficulty(questions, difficulty) {
  if (!difficulty || difficulty === 'all') return questions;
  return questions.filter((q) => q.difficulty === difficulty);
}

/**
 * 랜덤 추출
 */
export function randomSelect(questions, count) {
  if (count >= questions.length) return [...questions];
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default grammarQuestions;
