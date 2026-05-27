/**
 * 문법 카테고리 트리 정의
 * 국밥맨 AI 기출문제 분류 체계를 그대로 사용 (상세분류 버전)
 *
 * 구조: 학년 > 문법 > 세부 항목 > 문제 유형
 */

const grammarChaptersTemplate = [
  // ── Chapter 1: 문장의 종류 ──
  { subId: '1-1', label: '1-1. be동사' },
  { subId: '1-2', label: '1-2. 일반동사' },
  { subId: '1-3', label: '1-3. There is / There are 구문' },
  { subId: '1-4', label: '1-4. 의문사 의문문' },
  { subId: '1-5', label: '1-5. 간접의문문' },
  { subId: '1-6', label: '1-6. 부가의문문 및 부정의문문' },
  { subId: '1-7', label: '1-7. 명령문' },
  { subId: '1-8', label: '1-8. 감탄문' },
  { subId: '1-9', label: '1-9. 청유형' },

  // ── Chapter 2: 문장의 형식 ──
  { subId: '2-1', label: '2-1. 1형식 및 3형식 문장' },
  { subId: '2-2', label: '2-2. 2형식 문장' },
  { subId: '2-3', label: '2-3. 4형식 문장' },
  { subId: '2-4', label: '2-4. 5형식 (목적격 보어: 명사/형용사)' },
  { subId: '2-5', label: '2-5. 5형식 (목적격 보어: to부정사)' },
  { subId: '2-6', label: '2-6. 5형식 (사역동사)' },
  { subId: '2-7', label: '2-7. 5형식 (지각동사)' },
  { subId: '2-8', label: '2-8. 5형식 (목적격 보어: 과거분사)' },

  // ── Chapter 3: 조동사 ──
  { subId: '3-1', label: '3-1. can, be able to' },
  { subId: '3-2', label: '3-2. will, would' },
  { subId: '3-3', label: '3-3. may, might' },
  { subId: '3-4', label: "3-4. must, have to, don't need to" },
  { subId: '3-5', label: '3-5. should, ought to' },
  { subId: '3-6', label: '3-6. 강조의 do' },
  { subId: '3-7', label: '3-7. 조동사 + have p.p.' },
  { subId: '3-8', label: '3-8. 기타 조동사 표현' },

  // ── Chapter 4: 시제 ──
  { subId: '4-1', label: '4-1. 진행 시제' },
  { subId: '4-2', label: '4-2. 미래 시제' },
  { subId: '4-3', label: '4-3. 현재완료' },
  { subId: '4-4', label: '4-4. 과거완료 및 미래완료' },
  { subId: '4-5', label: '4-5. 완료 진행형' },

  // ── Chapter 5: 수동태 ──
  { subId: '5-1', label: '5-1. 수동태의 기본 및 조동사 수동태' },
  { subId: '5-2', label: '5-2. 4형식과 5형식의 수동태' },
  { subId: '5-3', label: '5-3. 주의해야 할 수동태' },

  // ── Chapter 6: 형용사 ──
  { subId: '6-1', label: '6-1. 수량 형용사' },
  { subId: '6-2', label: '6-2. 형용사의 쓰임 (한정적/서술적 용법)' },
  { subId: '6-3', label: '6-3. 주의해야 할 형용사 (형용사와 부사의 혼동 등)' },

  // ── Chapter 7: 부사 ──
  { subId: '7-1', label: '7-1. 빈도부사' },
  { subId: '7-2', label: '7-2. 부사의 수식 역할 및 주의할 부사' },
  { subId: '7-3', label: '7-3. 타동사 + 부사 (이어동사) 어순' },

  // ── Chapter 8: 명사와 대명사 ──
  { subId: '8-1', label: '8-1. 셀 수 있는 명사와 셀 수 없는 명사' },
  { subId: '8-2', label: '8-2. 부정관사(a/an)와 정관사(the)' },
  { subId: '8-3', label: '8-3. 명사의 수 일치 및 소유격/복수형' },
  { subId: '8-4', label: '8-4. 부분 표현' },
  { subId: '8-5', label: '8-5. 인칭대명사와 지시대명사 (대명사 수/격 일치)' },
  { subId: '8-6', label: '8-6. 비인칭 주어 it' },
  { subId: '8-7', label: '8-7. 재귀대명사' },
  { subId: '8-8', label: '8-8. 부정대명사 (one, another, the other, some, others 등)' },
  { subId: '8-9', label: '8-9. 부정대명사 (each, every, both, all)' },

  // ── Chapter 9: to부정사 ──
  { subId: '9-1', label: '9-1. 명사적 용법' },
  { subId: '9-2', label: '9-2. 형용사적 용법' },
  { subId: '9-3', label: '9-3. 부사적 용법' },
  { subId: '9-4', label: '9-4. 가주어 it과 가목적어 it' },
  { subId: '9-5', label: '9-5. 의미상 주어' },
  { subId: '9-6', label: '9-6. too ~ to, enough to' },

  // ── Chapter 10: 동명사 ──
  { subId: '10-1', label: '10-1. 동명사의 역할' },
  { subId: '10-2', label: '10-2. to부정사와 동명사를 목적어로 취하는 동사 구별' },
  { subId: '10-3', label: '10-3. 동명사의 관용 표현' },

  // ── Chapter 11: 분사 ──
  { subId: '11-1', label: '11-1. 명사를 수식하는 분사' },
  { subId: '11-2', label: '11-2. 감정을 나타내는 분사' },
  { subId: '11-3', label: '11-3. 분사구문' },
  { subId: '11-4', label: '11-4. with + 명사 + 분사 구문' },

  // ── Chapter 12: 관계사 ──
  { subId: '12-1', label: '12-1. 주격 관계대명사' },
  { subId: '12-2', label: '12-2. 목적격 관계대명사' },
  { subId: '12-3', label: '12-3. 소유격 관계대명사' },
  { subId: '12-4', label: '12-4. 관계대명사 what' },
  { subId: '12-5', label: '12-5. 관계대명사의 계속적 용법' },
  { subId: '12-6', label: '12-6. 관계부사' },
  { subId: '12-7', label: '12-7. 복합관계사' },

  // ── Chapter 13: 접속사 ──
  { subId: '13-1', label: '13-1. 등위접속사' },
  { subId: '13-2', label: '13-2. 상관접속사' },
  { subId: '13-3', label: '13-3. 명사절 접속사 that' },
  { subId: '13-4', label: '13-4. 명사절/부사절 if, whether' },
  { subId: '13-5', label: '13-5. 시간 부사절' },
  { subId: '13-6', label: '13-6. 이유 부사절' },
  { subId: '13-7', label: '13-7. 양보 부사절' },
  { subId: '13-8', label: '13-8. 목적/결과 부사절' },
  { subId: '13-9', label: '13-9. 전치사 vs 접속사 구별' },
  { subId: '13-10', label: '13-10. as의 쓰임' },

  // ── Chapter 14: 비교 구문 ──
  { subId: '14-1', label: '14-1. 원급 비교' },
  { subId: '14-2', label: '14-2. 비교급' },
  { subId: '14-3', label: '14-3. 최상급' },
  { subId: '14-4', label: '14-4. 배수사 및 비교 관용 표현' },

  // ── Chapter 15: 가정법 ──
  { subId: '15-1', label: '15-1. 가정법 과거, 과거완료' },
  { subId: '15-3', label: '15-3. 당위성 동사 뒤 should 생략' },

  // ── Chapter 16: 특수 구문 ──
  { subId: '16-1', label: '16-1. It ~ that 강조 구문' },
  { subId: '16-2', label: '16-2. 도치 구문' },
  { subId: '16-3', label: '16-3. 동격' },
  { subId: '16-4', label: '16-4. 병렬 구조' },
  { subId: '16-5', label: '16-5. 수/시제 일치 종합' },
  { subId: '16-6', label: '16-6. 화법 전환 및 대동사 do' },

  // ── 미분류 ──
  { subId: '99-1', label: '99-1. 미분류' }
];

const makeGrammarChildren = (parentId) => {
  return grammarChaptersTemplate.map((ch) => ({
    id: `${parentId}-${ch.subId}`,
    label: ch.label
  }));
};

const grammarCategories = [
  {
    id: 'high',
    label: '고등',
    children: [
      {
        id: 'high-1',
        label: '고1',
        children: [
          {
            id: 'high-1-grammar',
            label: '문법',
            children: makeGrammarChildren('high-1-grammar')
          }
        ]
      },
      {
        id: 'high-2',
        label: '고2',
        children: [
          {
            id: 'high-2-grammar',
            label: '문법',
            children: makeGrammarChildren('high-2-grammar')
          }
        ]
      },
      {
        id: 'high-3',
        label: '고3',
        children: [
          {
            id: 'high-3-grammar',
            label: '문법',
            children: makeGrammarChildren('high-3-grammar')
          }
        ]
      }
    ]
  },
  {
    id: 'middle',
    label: '중등',
    children: [
      {
        id: 'middle-1',
        label: '중1',
        children: [
          {
            id: 'middle-1-grammar',
            label: '문법',
            children: makeGrammarChildren('middle-1-grammar')
          }
        ]
      },
      {
        id: 'middle-2',
        label: '중2',
        children: [
          {
            id: 'middle-2-grammar',
            label: '문법',
            children: makeGrammarChildren('middle-2-grammar')
          }
        ]
      },
      {
        id: 'middle-3',
        label: '중3',
        children: [
          {
            id: 'middle-3-grammar',
            label: '문법',
            children: makeGrammarChildren('middle-3-grammar')
          }
        ]
      }
    ]
  }
];

/**
 * 모든 리프(leaf) 카테고리 ID를 재귀적으로 수집
 */
export function getAllLeafIds(nodes) {
  const ids = [];
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      ids.push(node.id);
    } else {
      ids.push(...getAllLeafIds(node.children));
    }
  }
  return ids;
}

/**
 * 특정 노드의 모든 하위 리프 ID 수집
 */
export function getDescendantLeafIds(node) {
  if (!node.children || node.children.length === 0) {
    return [node.id];
  }
  return node.children.flatMap(getDescendantLeafIds);
}

export default grammarCategories;
