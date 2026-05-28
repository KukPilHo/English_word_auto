/**
 * HistoryContext — 히스토리 전용 Context Provider
 * - 세션 목록 관리 (필터, 정렬)
 * - CRUD 작업 (저장, 로드, 삭제, 제목 수정)
 * - 세션 복원 시 AppContext 상태 복원 + 라우팅
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as repo from '../lib/sessionRepository';
import { createSession, TYPE_ROUTES } from '../lib/sessionSchemas';
import { useAppState } from './AppContext';

const HistoryContext = createContext(null);

export function HistoryProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [activeSessionId, setActiveSessionId] = useState(
    () => sessionStorage.getItem('activeSessionId') || null
  );

  const { setTypeBState, setTypeAState, setReadingOXState, setVariationState } = useAppState();
  const navigate = useNavigate();

  // ── activeSessionId를 sessionStorage에 동기화 ──
  useEffect(() => {
    if (activeSessionId) {
      sessionStorage.setItem('activeSessionId', activeSessionId);
    } else {
      sessionStorage.removeItem('activeSessionId');
    }
  }, [activeSessionId]);

  // ── 세션 목록 로드 ──
  const refreshSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const options = {
        sortBy: 'createdAt',
        order: 'desc',
      };
      if (filterType !== 'all') {
        options.type = filterType;
      }
      const list = await repo.getAll(options);
      setSessions(list);
    } catch (err) {
      console.error('세션 목록 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterType]);

  // 마운트 시 + 필터 변경 시 갱신
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // ── 세션 저장 ──
  const saveSession = useCallback(async (type, input, settings, result, metadata = {}) => {
    try {
      const session = createSession(type, input, settings, result, metadata);
      await repo.save(session);
      setActiveSessionId(session.id);
      await refreshSessions();
      return session.id;
    } catch (err) {
      console.error('세션 저장 실패:', err);
      return null;
    }
  }, [refreshSessions]);

  // ── 세션 로드 (복원) ──
  const loadSession = useCallback(async (id) => {
    try {
      const session = await repo.getById(id);
      if (!session) return false;

      const { type, input, settings, result } = session;

      // AppContext 상태 복원
      switch (type) {
        case 'typeB':
          setTypeBState(prev => ({
            ...prev,
            rawText: input.rawText || prev.rawText,
            parsedWords: input.parsedWords || [],
            difficulty: settings.difficulty || prev.difficulty,
            typeCounts: settings.typeCounts || prev.typeCounts,
            questions: result.questions || [],
            generationProgress: null,
          }));
          break;
        case 'typeA':
          setTypeAState(prev => ({
            ...prev,
            rawText: input.rawText || prev.rawText,
            parsedWords: input.parsedWords || [],
            passagesText: input.passagesText || prev.passagesText,
            passageImage: input.passageImage || null,
            difficulty: settings.difficulty || prev.difficulty,
            typeCounts: settings.typeCounts || prev.typeCounts,
            questions: result.questions || [],
          }));
          break;
        case 'readingOX':
          setReadingOXState(prev => ({
            ...prev,
            passageText: input.passageText || prev.passageText,
            difficulty: settings.difficulty || prev.difficulty,
            questionCount: settings.questionCount || prev.questionCount,
            questions: result.questions || [],
            generationProgress: null,
          }));
          break;
        case 'variation':
          setVariationState(prev => ({
            ...prev,
            sourceImages: input.sourceImages || [],
            sourceText: input.sourceText || '',
            extractedOriginal: result.extractedOriginal || '',
            extractedQuestion: result.extractedQuestion || '',
            extractedOptions: result.extractedOptions || '',
            transformedPassage: result.transformedPassage || '',
            difficulty: settings.difficulty || prev.difficulty,
            isExtracting: false,
            isTransforming: false,
          }));
          break;
        default:
          return false;
      }

      // 활성 세션 설정 + 페이지 이동
      setActiveSessionId(id);
      const route = TYPE_ROUTES[type];
      if (route) navigate(route);
      return true;
    } catch (err) {
      console.error('세션 로드 실패:', err);
      return false;
    }
  }, [navigate, setTypeBState, setTypeAState, setReadingOXState, setVariationState]);

  // ── 세션 삭제 ──
  const deleteSessionById = useCallback(async (id) => {
    try {
      await repo.deleteSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      await refreshSessions();
      return true;
    } catch (err) {
      console.error('세션 삭제 실패:', err);
      return false;
    }
  }, [activeSessionId, refreshSessions]);

  // ── 전체 삭제 ──
  const deleteAllSessions = useCallback(async () => {
    try {
      await repo.deleteAll();
      setActiveSessionId(null);
      await refreshSessions();
      return true;
    } catch (err) {
      console.error('전체 삭제 실패:', err);
      return false;
    }
  }, [refreshSessions]);

  // ── 제목 수정 ──
  const updateTitle = useCallback(async (id, title) => {
    try {
      await repo.update(id, { title });
      await refreshSessions();
      return true;
    } catch (err) {
      console.error('제목 수정 실패:', err);
      return false;
    }
  }, [refreshSessions]);

  return (
    <HistoryContext.Provider value={{
      sessions,
      isLoading,
      filterType,
      setFilterType,
      saveSession,
      loadSession,
      deleteSession: deleteSessionById,
      deleteAllSessions,
      updateTitle,
      activeSessionId,
      refreshSessions,
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistory = () => useContext(HistoryContext);
