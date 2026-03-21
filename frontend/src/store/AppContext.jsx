import { createContext, useContext, useState } from 'react';
import { VOCAB_TYPES, PASSAGE_TYPES, getDefaultTypeCounts, DIFFICULTY_LEVELS } from '../lib/questionTypes';

const DEFAULT_EXAMPLE = `아래와 같이 자유롭게 영어 단어와 풀이를 입력하거나, 단어장 이미지를 캡처 후 붙여넣어(Ctrl+V) [AI 분석 시작]을 눌러보세요.

apologize: to tell someone that you are sorry
arrival: the act of arriving somewhere
capital: an important city that is the center of government of a country
casual: not formal or not for a formal situation
communicate: to share information with others by speaking, writing, moving your body, etc.
correctly: in a way that is right or true
courage: the ability to do something that you know is difficult or dangerous
damage: physical harm that makes something less useful or valuable
encourage: to give someone hope, confidence, or support
exchange: to give something and receive something of the same kind in return
familiar: well known to you, or easy to recognize
generous: willing to give money, help, or time freely
identify: to recognize or be able to name someone or something
imagine: to form a picture in your mind of what something could be like
journey: an act of traveling from one place to another`;

const DEFAULT_PASSAGES = `[지문 1]
Do you want to make healthy ramyeon? This is my recipe. First, boil water and put in
ramyeon, sauce, and tteok. Cut some carrots and gimchi, and add them. Now, this is my
secret. Put some milk and cheese. It looks tasty, doesn't it?

---

[지문 2]
Last summer, I visited the capital city of France. The weather was perfect, and the people were friendly. I recommend everyone to visit Paris once in their life.`;

const DEFAULT_READING_PASSAGE = `Last summer, my father suggested a surprising event: a family trip without smartphones! He said, "I hate to see you sitting together and only looking at your smartphones." My sister and I explained the need for smartphones, but he kept saying that we could not fully enjoy the trip with them. So we started a technology-free trip to a new city, Barcelona, Spain.

Our first day was terrible. On the way to our guesthouse around Plaza Reial, we got lost in downtown Barcelona. Dad was busy looking at the map and asking for directions with a few Spanish words he got from a tour guidebook. Even though our guesthouse was right next to the Plaza, it took us about two hours to get there. We were so tired that we could not go out for dinner.`;

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Type B State (단어 기반)
  const [typeBState, setTypeBState] = useState({
    rawText: DEFAULT_EXAMPLE,
    parsedWords: [],
    questions: [],
    difficulty: DIFFICULTY_LEVELS[3].value,
    typeCounts: getDefaultTypeCounts(VOCAB_TYPES),
    generationProgress: null,
  });

  // Type A State (지문 기반 영영풀이)
  const [typeAState, setTypeAState] = useState({
    rawText: DEFAULT_EXAMPLE,
    parsedWords: [],
    passagesText: DEFAULT_PASSAGES,
    passageImage: null,
    questions: [],
    difficulty: DIFFICULTY_LEVELS[3].value,
    typeCounts: getDefaultTypeCounts(PASSAGE_TYPES),
  });

  // Reading O/X State (지문 일치/불일치)
  const [readingOXState, setReadingOXState] = useState({
    passageText: DEFAULT_READING_PASSAGE,
    questions: [],
    difficulty: DIFFICULTY_LEVELS[3].value,
    questionCount: 1,
    generationProgress: null,
  });

  // Variation State (다풀백 지문 변형)
  const [variationState, setVariationState] = useState({
    sourceImage: null,
    extractedOriginal: '',
    extractedQuestion: '',
    extractedOptions: '',
    transformedPassage: '',
    difficulty: DIFFICULTY_LEVELS[3].value,
  });

  return (
    <AppContext.Provider value={{
      typeBState, setTypeBState,
      typeAState, setTypeAState,
      readingOXState, setReadingOXState,
      variationState, setVariationState,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppState = () => useContext(AppContext);
