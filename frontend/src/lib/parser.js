export function parseWordList(rawText) {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split('\n');
  const parsed = [];
  
  let idCounter = 1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Support either Excel Tab separated or Pipe (|) separated
    const separator = trimmed.includes('\t') ? '\t' : '|';
    const parts = trimmed.split(separator).map(p => p.trim());
    
    if (parts.length >= 4) {
      parsed.push({
        id: idCounter++,
        word: parts[0],
        pos: parts[1],
        meaning_kr: parts[2],
        meaning_en: parts[3],
        example: parts.length > 4 ? parts[4] : ''
      });
    }
  }
  return parsed;
}
