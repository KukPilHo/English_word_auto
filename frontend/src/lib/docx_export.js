import { Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';

/* ────────────────────────────────────
   공통 헬퍼
   ──────────────────────────────────── */

function createInstructionHeader(num, instruction) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${num}. ${instruction}`,
        bold: true,
        size: 24, // 12pt
      })
    ],
    spacing: { after: 200 }
  });
}

function createBoxedContent(paragraphs) {
  const cell = new TableCell({
    children: paragraphs,
    margins: { top: 200, bottom: 200, left: 200, right: 200 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    }
  });

  return new Table({
    rows: [new TableRow({ children: [cell] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/* ────────────────────────────────────
   Type 1: 단어-영영풀이 매칭
   ──────────────────────────────────── */

function renderType1(q) {
  const elements = [];

  elements.push(createInstructionHeader(q.number, q.instruction));

  // 상단 단어 테이블: ㉠ word  ㉡ word ...
  const wordLine = q.wordLabels.map(wl => `${wl.label} ${wl.word}`).join('     ');
  const wordRow = new Paragraph({
    children: [new TextRun({ text: wordLine, size: 22, bold: true })],
    spacing: { after: 200 }
  });

  // 하단 영영풀이 리스트
  const defParas = q.defLabels.map(dl =>
    new Paragraph({
      children: [new TextRun({ text: `${dl.label} ${dl.definition}`, size: 22 })],
      spacing: { after: 80 }
    })
  );

  elements.push(createBoxedContent([wordRow, ...defParas]));
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 5지선다
  q.choices.forEach(c => {
    const mappingText = q.wordLabels.map(wl => `${wl.label}-${c.mapping[wl.label]}`).join(', ');
    elements.push(new Paragraph({
      children: [new TextRun({ text: `${c.number} ${mappingText}`, size: 22 })],
      spacing: { after: 80 }
    }));
  });

  elements.push(new Paragraph({ spacing: { after: 400 } }));
  return elements;
}

/* ────────────────────────────────────
   Type 2: 빈칸 영영풀이 매칭 (기존)
   ──────────────────────────────────── */

function renderType2(q) {
  const elements = [];

  elements.push(createInstructionHeader(q.number, q.instruction));

  // 예문
  const sentenceParas = (q.sentences || []).map(s =>
    new Paragraph({
      children: [
        new TextRun({ text: `ㅇ `, size: 22 }),
        new TextRun({ text: s.text, size: 22 })
      ],
      indent: { left: 360 },
      spacing: { after: 120 }
    })
  );
  elements.push(...sentenceParas);
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 보기 박스
  const header = new Paragraph({ children: [new TextRun({ text: "<보기>", size: 22 })], spacing: { after: 100 } });
  const optionLines = (q.options || []).map(opt =>
    new Paragraph({
      children: [new TextRun({ text: `${opt.label} ${opt.definition}`, size: 22 })],
      spacing: { after: 80 }
    })
  );
  elements.push(createBoxedContent([header, ...optionLines]));
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 선택지
  const choicesText = (q.choices || []).map(c => `${c.number} ${Object.values(c.mapping).join('   ')}`).join('\n');
  elements.push(new Paragraph({
    children: [new TextRun({ text: choicesText, size: 22 })],
    spacing: { after: 400 }
  }));

  return elements;
}

/* ────────────────────────────────────
   Type 3: 단일 빈칸 영영풀이 5지선다
   ──────────────────────────────────── */

function renderType3(q) {
  const elements = [];

  elements.push(createInstructionHeader(q.number, q.instruction));

  // 문장 박스
  const sentencePara = new Paragraph({
    children: [new TextRun({ text: q.sentence, size: 22 })],
    spacing: { after: 100 }
  });
  elements.push(createBoxedContent([sentencePara]));
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 5지선다 영영풀이
  (q.choices || []).forEach(c => {
    elements.push(new Paragraph({
      children: [new TextRun({ text: `${c.number} ${c.definition}`, size: 22 })],
      spacing: { after: 100 }
    }));
  });

  elements.push(new Paragraph({ spacing: { after: 400 } }));
  return elements;
}

/* ────────────────────────────────────
   Type A: 지문 기반 (기존)
   ──────────────────────────────────── */

function renderTypeA(q) {
  const elements = [];

  elements.push(createInstructionHeader(q.number, q.instruction));

  // 지문 박스
  const lines = (q.passage || '').split('\n');
  const passageParas = lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, size: 22 })],
    spacing: { after: 60 }
  }));
  elements.push(createBoxedContent(passageParas));
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 보기
  (q.options || []).forEach(opt => {
    elements.push(new Paragraph({
      children: [new TextRun({ text: `${opt.label} ${opt.definition}`, size: 22 })],
      spacing: { after: 80 }
    }));
  });
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 선택지
  const choicesText = (q.choices || []).map(c => `${c.number}  ${c.combination.join('   ')}`).join('      ');
  elements.push(new Paragraph({
    children: [new TextRun({ text: choicesText, size: 22 })],
    spacing: { after: 400 }
  }));

  return elements;
}

/* ────────────────────────────────────
   Reading OX: 지문 일치/불일치
   ──────────────────────────────────── */

function renderReadingOX(q) {
  const elements = [];

  elements.push(createInstructionHeader(q.number, q.instruction));

  // 지문 박스
  const lines = (q.passage || '').split('\n');
  const passageParas = lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, size: 22 })],
    spacing: { after: 60 }
  }));
  elements.push(createBoxedContent(passageParas));
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // O/X 진술문 (보기)
  const header = new Paragraph({ children: [new TextRun({ text: "<보기>", size: 22 })], spacing: { after: 100 } });
  const statementParas = (q.statements || []).map(s =>
    new Paragraph({
      children: [new TextRun({ text: `${s.label} ${s.text}`, size: 22 })],
      spacing: { after: 80 }
    })
  );
  elements.push(createBoxedContent([header, ...statementParas]));
  elements.push(new Paragraph({ spacing: { after: 200 } }));

  // 선택지 (O/X 배열)
  const choicesText = (q.choices || []).map(c => `${c.number}  ${c.combination.join('   ')}`).join('      ');
  elements.push(new Paragraph({
    children: [new TextRun({ text: choicesText, size: 22 })],
    spacing: { after: 400 }
  }));

  return elements;
}

/* ────────────────────────────────────
   메인 내보내기 함수
   ──────────────────────────────────── */

export async function exportToDocx(questions, filename) {
  const docElements = [];

  for (const q of questions) {
    switch (q.typeId) {
      case 'word_matching':
        docElements.push(...renderType1(q));
        break;
      case 'blank_matching':
        docElements.push(...renderType2(q));
        break;
      case 'single_blank':
        docElements.push(...renderType3(q));
        break;
      case 'reading_ox':
        docElements.push(...renderReadingOX(q));
        break;
      default:
        // 기존 TypeA/TypeB 호환
        if (q.type === 'TypeA') {
          docElements.push(...renderTypeA(q));
        } else if (q.type === 'TypeB') {
          docElements.push(...renderType2(q));
        }
        break;
    }
  }

  const doc = new Document({
    creator: "EngGen",
    sections: [{
      properties: {},
      children: docElements
    }]
  });

  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
