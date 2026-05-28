import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

// Helper to shuffle array
function shuffle(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

/**
 * 템플릿 기반으로 누적 시험지를 생성합니다.
 * Python word_processor.py의 generate_tests_with_docxtpl 과 100% 동일한 로직.
 * 서버 없이 브라우저에서 직접 실행됩니다.
 */
export async function exportCumulativeTests(lessonsObj, filename) {
  // 1. 템플릿 파일 로드 (public/template.docx)
  const templateUrl = `${import.meta.env.BASE_URL}template.docx`;
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error(`템플릿 파일을 불러올 수 없습니다: ${templateUrl}`);
  const templateArrayBuffer = await response.arrayBuffer();

  // 2. 데이터 준비 (Python word_processor.py 로직 그대로)
  const totalLessons = Object.keys(lessonsObj).length;
  const lessonsContext = [];

  for (let i = 1; i <= totalLessons; i++) {
    const currentLessonPairs = lessonsObj[i] || [];
    const pairsForTest = [];

    if (currentLessonPairs.length >= 50) {
      pairsForTest.push(...shuffle(currentLessonPairs).slice(0, 50));
    } else {
      pairsForTest.push(...currentLessonPairs);
      const previousPairs = [];
      for (let j = 1; j < i; j++) {
        previousPairs.push(...(lessonsObj[j] || []));
      }
      const numNeeded = 50 - currentLessonPairs.length;
      if (numNeeded > 0 && previousPairs.length > 0) {
        const shuffledPrev = shuffle(previousPairs);
        pairsForTest.push(...shuffledPrev.slice(0, numNeeded));
      }
    }

    // 문제지 생성
    const problemPairs = shuffle([...pairsForTest]);
    const finalEnglishWords = problemPairs.map(p => p[0]);
    const finalKoreanTranslations = shuffle(problemPairs.map(p => p[1]));

    // 50행 패딩
    while (finalEnglishWords.length < 50) finalEnglishWords.push('');
    while (finalKoreanTranslations.length < 50) finalKoreanTranslations.push('');
    const blankTable = new Array(50).fill('');

    // [PAGE 1] 문제지 (영어) - 영어만 보여줌
    const wordPage = { lesson_number: i, show_words: true, show_translations: false };
    for (let n = 0; n < 50; n++) { wordPage[`w${n}`] = finalEnglishWords[n]; wordPage[`t${n}`] = ''; }
    wordPage.notlast = true;  // 항상 다음 페이지 있음
    lessonsContext.push(wordPage);

    // [PAGE 2] 문제지 (한글) - 한글만 보여줌
    const transPage = { lesson_number: i, show_words: false, show_translations: true };
    for (let n = 0; n < 50; n++) { transPage[`w${n}`] = ''; transPage[`t${n}`] = finalKoreanTranslations[n]; }
    transPage.notlast = true;
    lessonsContext.push(transPage);

    // 답지 생성
    const answerEnglishWords = problemPairs.map(([eng, kor]) => `${eng} ${kor}`);
    while (answerEnglishWords.length < 50) answerEnglishWords.push('');

    const korToEngs = {};
    for (const [eng, kor] of pairsForTest) {
      if (!korToEngs[kor]) korToEngs[kor] = [];
      korToEngs[kor].push(eng);
    }
    const answerKoreanTranslations = [];
    for (let n = 0; n < 50; n++) {
      const kor = finalKoreanTranslations[n];
      if (kor === '') {
        answerKoreanTranslations.push('');
      } else {
        const engList = korToEngs[kor] || [];
        const eng = engList.length > 0 ? engList.shift() : '';
        answerKoreanTranslations.push(`${kor} ${eng}`);
      }
    }
    while (answerKoreanTranslations.length < 50) answerKoreanTranslations.push('');

    // [PAGE 3] 답지 (영어)
    const ansWordPage = { lesson_number: i, show_words: true, show_translations: false };
    for (let n = 0; n < 50; n++) { ansWordPage[`w${n}`] = answerEnglishWords[n]; ansWordPage[`t${n}`] = ''; }
    ansWordPage.notlast = true;
    lessonsContext.push(ansWordPage);

    // [PAGE 4] 답지 (한글)
    const ansTransPage = { lesson_number: i, show_words: false, show_translations: true };
    for (let n = 0; n < 50; n++) { ansTransPage[`w${n}`] = ''; ansTransPage[`t${n}`] = answerKoreanTranslations[n]; }
    // 마지막 레슨의 마지막 페이지만 notlast = false
    ansTransPage.notlast = (i < totalLessons);
    lessonsContext.push(ansTransPage);
  }

  // 3. docxtemplater로 렌더링
  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({ lessons: lessonsContext });

  // 4. 다운로드
  const outputBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  saveAs(outputBlob, filename);
}
