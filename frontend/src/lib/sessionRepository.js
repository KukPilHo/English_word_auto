/**
 * IndexedDB 기반 세션 저장소 (Repository Pattern)
 * - idb 라이브러리를 사용한 Promise 기반 API
 * - 100개 세션 상한, FIFO 자동 삭제
 * - 향후 APIRepository로 교체 가능한 인터페이스
 */

import { openDB } from 'idb';
import { MAX_SESSIONS } from './sessionSchemas';

const DB_NAME = 'english_question_generator';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// ── DB 초기화 ──
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// ── Repository 메서드 ──

/**
 * 세션 저장
 * 100개 초과 시 가장 오래된 세션부터 자동 삭제
 */
export async function save(session) {
  const db = await getDB();

  // 상한 체크 및 FIFO 삭제
  const count = await db.count(STORE_NAME);
  if (count >= MAX_SESSIONS) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('createdAt');
    let cursor = await index.openCursor(); // 가장 오래된 것부터
    const deleteCount = count - MAX_SESSIONS + 1;
    let deleted = 0;

    while (cursor && deleted < deleteCount) {
      await cursor.delete();
      deleted++;
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  await db.put(STORE_NAME, session);
}

/**
 * ID로 세션 조회
 */
export async function getById(id) {
  const db = await getDB();
  return (await db.get(STORE_NAME, id)) || null;
}

/**
 * 전체 세션 조회 (필터/정렬/페이지네이션)
 */
export async function getAll(options = {}) {
  const { type, sortBy = 'createdAt', order = 'desc', limit, offset = 0 } = options;
  const db = await getDB();

  let sessions;

  if (type) {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('type');
    sessions = await index.getAll(type);
    await tx.done;
  } else {
    sessions = await db.getAll(STORE_NAME);
  }

  // 정렬
  sessions.sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    return order === 'desc'
      ? bVal.localeCompare(aVal)
      : aVal.localeCompare(bVal);
  });

  // 페이지네이션
  if (limit) {
    sessions = sessions.slice(offset, offset + limit);
  } else if (offset > 0) {
    sessions = sessions.slice(offset);
  }

  return sessions;
}

/**
 * 세션 부분 업데이트
 */
export async function update(id, partial) {
  const db = await getDB();
  const existing = await db.get(STORE_NAME, id);
  if (!existing) return;

  const updated = {
    ...existing,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  // metadata 병합 (덮어쓰기 방지)
  if (partial.metadata) {
    updated.metadata = { ...existing.metadata, ...partial.metadata };
  }

  await db.put(STORE_NAME, updated);
}

/**
 * 세션 삭제
 */
export async function deleteSession(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * 전체 세션 삭제
 */
export async function deleteAll() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * 세션 개수 조회
 */
export async function count(type) {
  const db = await getDB();

  if (type) {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('type');
    const result = await index.count(type);
    await tx.done;
    return result;
  }

  return db.count(STORE_NAME);
}

// ── 편의 함수: 용량 경고 필요 여부 ──
export async function shouldWarnCapacity() {
  const total = await count();
  return total >= 90; // WARNING_THRESHOLD
}
