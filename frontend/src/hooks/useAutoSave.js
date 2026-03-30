/**
 * useAutoSave — 문제 생성 완료 시 자동 저장 Hook
 * 
 * 각 페이지에서 saveToHistory()를 호출하면:
 * 1. 현재 상태에서 input/settings/result를 추출
 * 2. HistoryContext의 saveSession 호출
 * 3. 빈 결과(생성 실패)는 저장하지 않음
 */

import { useCallback } from 'react';
import { useHistory } from '../store/HistoryContext';
import { useSettings } from '../store/SettingsContext';

/**
 * @param {string} type - 세션 유형 ('typeB' | 'typeA' | 'readingOX' | 'variation')
 * @returns {{ saveToHistory: (input, settings, result, metadata) => Promise<string|null> }}
 */
export function useAutoSave(type) {
  const { saveSession } = useHistory();
  const { model } = useSettings();

  const saveToHistory = useCallback(async (input, settings, result, extraMetadata = {}) => {
    // 빈 결과는 저장하지 않음
    if (!result || (Array.isArray(result.questions) && result.questions.length === 0)) {
      // variation 유형은 questions 배열이 없고 transformedPassage를 체크
      if (type === 'variation' && !result?.transformedPassage) return null;
      if (type !== 'variation') return null;
    }

    const metadata = {
      model,
      ...extraMetadata,
    };

    return saveSession(type, input, settings, result, metadata);
  }, [type, saveSession, model]);

  return { saveToHistory };
}
