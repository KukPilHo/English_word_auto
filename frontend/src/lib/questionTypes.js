/**
 * 문제 유형 중앙 레지스트리
 * 나중에 사용자가 유형별 예시 문항을 제공하면 example 필드에 추가하면 됩니다.
 */

// 단어 기반 (TypeB) 문제 유형들
export const VOCAB_TYPES = [
  {
    id: 'blank_matching',
    name: '빈칸 영영풀이 매칭',
    desc: '예문 빈칸에 단어를 넣고 영영풀이와 매칭',
    defaultCount: 1,
    enabled: true,
    example: null, // 나중에 예시 문항 추가
  },
  {
    id: 'vocab_type_2',
    name: '유형 2 (추후 추가)',
    desc: '사용자 제공 예정',
    defaultCount: 0,
    enabled: false,
    example: null,
  },
  {
    id: 'vocab_type_3',
    name: '유형 3 (추후 추가)',
    desc: '사용자 제공 예정',
    defaultCount: 0,
    enabled: false,
    example: null,
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
    example: null,
  },
  {
    id: 'passage_type_2',
    name: '유형 2 (추후 추가)',
    desc: '사용자 제공 예정',
    defaultCount: 0,
    enabled: false,
    example: null,
  },
  {
    id: 'passage_type_3',
    name: '유형 3 (추후 추가)',
    desc: '사용자 제공 예정',
    defaultCount: 0,
    enabled: false,
    example: null,
  },
];

/** 유형 목록에서 초기 typeCounts 객체를 생성합니다 */
export function getDefaultTypeCounts(types) {
  const counts = {};
  types.forEach(t => { counts[t.id] = t.defaultCount; });
  return counts;
}
