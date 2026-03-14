import { Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver'; // We need to install file-saver

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

function createTypeAPassage(passageText) {
  const lines = passageText.split('\n');
  const paragraphs = lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, size: 22 })],
    spacing: { after: 60 }
  }));

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
    margins: { bottom: 200 }
  });
}

function createTypeBSentences(sentences) {
  return sentences.map(s => {
    return new Paragraph({
      children: [
        new TextRun({ text: `ㅇ `, size: 22 }),
        new TextRun({ text: s.text, size: 22 })
      ],
      indent: { left: 360 }, // approx 0.25 inch
      spacing: { after: 120 }
    });
  });
}

function createBoxedOptions(options, type) {
  // Option box with <보기>
  const header = new Paragraph({ children: [new TextRun({ text: "<보기>", size: 22 })], spacing: { after: 100 } });
  
  const optionLines = options.map(opt => {
    return new Paragraph({
      children: [
        new TextRun({ text: `${opt.label} ${opt.definition}`, size: 22 })
      ],
      spacing: { after: 80 }
    });
  });

  const cell = new TableCell({
    children: [header, ...optionLines],
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
    margins: { bottom: 300 }
  });
}

export async function exportToDocx(questions, filename) {
  const docElements = [];

  for (const q of questions) {
    if (q.type === 'TypeB') {
      docElements.push(createInstructionHeader(q.number, q.instruction));
      docElements.push(...createTypeBSentences(q.sentences));
      
      // empty space
      docElements.push(new Paragraph({ spacing: { after: 200 } }));
      
      docElements.push(createBoxedOptions(q.options, 'TypeB'));
      
      docElements.push(new Paragraph({ spacing: { after: 200 } }));

      // Choices
      const choicesText = q.choices.map(c => `${c.number} ${Object.values(c.mapping).join('   ')}`).join('\n');
      docElements.push(new Paragraph({
        children: [new TextRun({ text: choicesText, size: 22 })],
        spacing: { after: 400 }
      }));
    } else if (q.type === 'TypeA') {
      docElements.push(createInstructionHeader(q.number, q.instruction));
      
      // Boxed Passage
      docElements.push(createTypeAPassage(q.passage));
      docElements.push(new Paragraph({ spacing: { after: 200 } }));
      
      // Options (not boxed in Type A usually, but we can reuse the same or just list them)
      const optionLines = q.options.map(opt => {
        return new Paragraph({
          children: [new TextRun({ text: `${opt.label} ${opt.definition}`, size: 22 })],
          spacing: { after: 80 }
        });
      });
      docElements.push(...optionLines);
      docElements.push(new Paragraph({ spacing: { after: 200 } }));

      // Choices (5지선다)
      const choicesText = q.choices.map(c => `${c.number}  ${c.combination.join('   ')}`).join('      ');
      docElements.push(new Paragraph({
        children: [new TextRun({ text: choicesText, size: 22 })],
        spacing: { after: 400 }
      }));
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
