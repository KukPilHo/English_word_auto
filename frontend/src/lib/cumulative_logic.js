import mammoth from 'mammoth';

const norm = (text) => (text || '').trim().toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

const looksLikeNumber = (s) => /^\s*\d+/.test((s || '').trim());

const isKoreanText = (s) => {
    const text = s || '';
    const hangul = (text.match(/[가-힣]/g) || []).length;
    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    return hangul > 0 && (hangul / Math.max(letters, 1) >= 0.3);
};

export async function parseCumulativeWords(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const result = await mammoth.convertToHtml({ arrayBuffer });
                const html = result.value;
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const tables = doc.querySelectorAll('table');
                
                const lessons = {};
                let currentLesson = 0;
                
                tables.forEach(table => {
                    let wordIdx = null;
                    let transIdx = null;
                    
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = Array.from(row.querySelectorAll('td, th')).map(td => td.textContent.replace(/[\n\r]/g, '').trim());
                        if (cells.length === 0) return;
                        
                        // 1. Detect headers
                        if (cells.length > 1) {
                            const c0 = norm(cells[0]);
                            const c1 = norm(cells[1]);
                            if (['no', 'number', '번호'].includes(c0) && ['word', 'words', '단어'].includes(c1)) {
                                currentLesson++;
                                lessons[currentLesson] = [];
                                wordIdx = 1;
                                transIdx = null;
                                
                                const headerNorms = cells.map(norm);
                                for (let j = 0; j < headerNorms.length; j++) {
                                    if (['translation', '해석', '뜻', '의미'].includes(headerNorms[j])) {
                                        transIdx = j;
                                        break;
                                    }
                                }
                                if (transIdx === null) {
                                    for (let j = 0; j < headerNorms.length; j++) {
                                        if (headerNorms[j] === 'meaning') {
                                            transIdx = j;
                                            break;
                                        }
                                    }
                                }
                                return; // continue
                            }
                        }
                        
                        // 2. No header, but starts with number -> new lesson
                        if (currentLesson === 0 && cells.length >= 2 && looksLikeNumber(cells[0])) {
                            currentLesson = 1;
                            lessons[currentLesson] = [];
                            wordIdx = 1;
                            transIdx = null;
                        }
                        
                        // 3. Process data row
                        if (currentLesson > 0 && cells.length >= 2 && looksLikeNumber(cells[0])) {
                            const wi = (wordIdx !== null && wordIdx < cells.length) ? wordIdx : 1;
                            let ti = (transIdx !== null && transIdx < cells.length) ? transIdx : null;
                            
                            if (ti === null) {
                                if (cells.length >= 5) ti = 4;
                                else if (cells.length >= 4) ti = 3;
                                else if (cells.length >= 3) ti = 2;
                                else ti = cells.length - 1;
                            }
                            
                            let translation = cells[ti];
                            if (!isKoreanText(translation)) {
                                for (let j = 2; j < cells.length; j++) {
                                    if (isKoreanText(cells[j])) {
                                        translation = cells[j];
                                        ti = j;
                                        break;
                                    }
                                }
                            }
                            
                            const word = cells[wi];
                            if (word) {
                                lessons[currentLesson].push([word, translation]);
                            }
                        }
                    });
                });
                
                resolve(lessons);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
    });
}
