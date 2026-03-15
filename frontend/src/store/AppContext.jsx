import { createContext, useContext, useState } from 'react';
import { VOCAB_TYPES, PASSAGE_TYPES, getDefaultTypeCounts } from '../lib/questionTypes';

const DEFAULT_EXAMPLE = `아래와 같이 자유롭게 영어 단어와 풀이를 입력하거나, 단어장 이미지를 캡처 후 붙여넣어(Ctrl+V) [AI 분석 시작]을 눌러보세요.

apologize: to tell someone that you are sorry
arrival (도착): the act of arriving somewhere
capital
casual - not formal
communicate
correctly`;

const DEFAULT_PARSED_WORDS = [
  { id: 1, word: 'apologize', meaning_en: 'to tell someone that you are sorry' },
  { id: 2, word: 'arrival', meaning_en: 'the act of arriving somewhere' },
  { id: 3, word: 'capital', meaning_en: 'an important city that is the center of government of a country' },
  { id: 4, word: 'casual', meaning_en: 'not formal or not for a formal situation' },
  { id: 5, word: 'communicate', meaning_en: 'to share information with others by speaking, writing, moving your body, etc.' },
  { id: 6, word: 'correctly', meaning_en: 'in a way that is right or true' }
];

const DEFAULT_PASSAGES = `[지문 1]
Do you want to make healthy ramyeon? This is my recipe. First, boil water and put in
ramyeon, sauce, and tteok. Cut some carrots and gimchi, and add them. Now, this is my
secret. Put some milk and cheese. It looks tasty, doesn't it?

---

[지문 2]
Last summer, I visited the capital city of France. The weather was perfect, and the people were friendly. I recommend everyone to visit Paris once in their life.`;

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Type B State
  const [typeBState, setTypeBState] = useState({
    rawText: DEFAULT_EXAMPLE,
    parsedWords: [],
    questions: [],
    difficulty: '고1 수준',
    typeCounts: getDefaultTypeCounts(VOCAB_TYPES),
  });

  // Type A State
  const [typeAState, setTypeAState] = useState({
    rawText: DEFAULT_EXAMPLE,
    parsedWords: [],
    passagesText: DEFAULT_PASSAGES,
    passageImage: null,
    questions: [],
    difficulty: '고1 수준',
    typeCounts: getDefaultTypeCounts(PASSAGE_TYPES),
  });

  return (
    <AppContext.Provider value={{
      typeBState, setTypeBState,
      typeAState, setTypeAState
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppState = () => useContext(AppContext);
