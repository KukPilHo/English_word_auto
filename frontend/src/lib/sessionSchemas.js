/**
 * 세션 스키마 정의 및 유틸리티
 * - 세션 유형 상수
 * - 유형별 라벨/라우트/색상 매핑
 * - 자동 제목 생성
 * - 세션 객체 팩토리
 */

// ── 세션 유형 상수 ──
export const SESSION_TYPES = {
  TYPE_B: 'typeB',
  TYPE_A: 'typeA',
  READING_OX: 'readingOX',
  VARIATION: 'variation',
};

// ── 유형별 한글 라벨 ──
export const TYPE_LABELS = {
  typeB: '어휘문제',
  typeA: '지문기반',
  readingOX: '독해O/X',
  variation: '지문변형',
};

// ── 유형별 라우트 매핑 ──
export const TYPE_ROUTES = {
  typeB: '/',
  typeA: '/passage',
  readingOX: '/reading-ox',
  variation: '/variation',
};

// ── 유형별 배지 색상 (Tailwind 클래스) ──
export const TYPE_COLORS = {
  typeB: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  typeA: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  readingOX: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  variation: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
};

// ── 유형별 아이콘 이모지 ──
export const TYPE_ICONS = {
  typeB: '📝',
  typeA: '📄',
  readingOX: '✏️',
  variation: '🔄',
};

// ── 난이도 라벨 추출 ──
export function getDifficultyLabel(difficultyValue) {
  if (!difficultyValue) return '';
  const match = difficultyValue.match(/^(.*?)\s*\(/);
  return match ? match[1].trim() : difficultyValue;
}

// ── 자동 제목 생성 ──
export function generateSessionTitle(type, metadata = {}) {
  const label = TYPE_LABELS[type] || type;
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let summary = '';
  switch (type) {
    case SESSION_TYPES.TYPE_B:
      summary = [
        metadata.wordCount ? `단어 ${metadata.wordCount}개` : null,
        metadata.questionCount ? `문제 ${metadata.questionCount}개` : null,
      ].filter(Boolean).join(', ');
      break;
    case SESSION_TYPES.TYPE_A:
      summary = [
        metadata.wordCount ? `단어 ${metadata.wordCount}개` : null,
        metadata.passageCount ? `지문 ${metadata.passageCount}개` : null,
      ].filter(Boolean).join(', ');
      break;
    case SESSION_TYPES.READING_OX:
      summary = metadata.questionCount ? `문제 ${metadata.questionCount}개` : '';
      break;
    case SESSION_TYPES.VARIATION:
      summary = metadata.difficulty ? getDifficultyLabel(metadata.difficulty) : '';
      break;
    default:
      break;
  }

  return `[${label}] ${dateStr}${summary ? ` — ${summary}` : ''}`;
}

// ── UUID 생성 ──
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── 세션 객체 팩토리 ──
export function createSession(type, input, settings, result, metadata = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    type,
    title: generateSessionTitle(type, metadata),
    createdAt: now,
    updatedAt: now,
    metadata: {
      model: metadata.model || '',
      wordCount: metadata.wordCount || null,
      questionCount: metadata.questionCount || null,
      passageCount: metadata.passageCount || null,
      version: 1,
    },
    input,
    settings,
    result,
  };
}

// ── 세션 요약 텍스트 생성 ──
export function getSessionSummary(session) {
  const { type, metadata } = session;
  switch (type) {
    case SESSION_TYPES.TYPE_B:
      return [
        metadata.wordCount ? `단어 ${metadata.wordCount}개` : null,
        metadata.questionCount ? `문제 ${metadata.questionCount}개` : null,
      ].filter(Boolean).join(', ') || '생성됨';
    case SESSION_TYPES.TYPE_A:
      return [
        metadata.wordCount ? `단어 ${metadata.wordCount}개` : null,
        metadata.passageCount ? `지문 ${metadata.passageCount}개` : null,
      ].filter(Boolean).join(', ') || '생성됨';
    case SESSION_TYPES.READING_OX:
      return metadata.questionCount ? `문제 ${metadata.questionCount}개` : '생성됨';
    case SESSION_TYPES.VARIATION:
      return metadata.difficulty ? getDifficultyLabel(metadata.difficulty) : '생성됨';
    default:
      return '생성됨';
  }
}

// ── 상대 시간 표시 ──
export function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

// ── 세션 최대 개수 ──
export const MAX_SESSIONS = 100;
export const WARNING_THRESHOLD = 90;
