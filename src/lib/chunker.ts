export interface TextChunk {
  content: string;
  index: number;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string): TextChunk[] {
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleanedText.length <= CHUNK_SIZE) {
    return [{ content: cleanedText, index: 0 }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleanedText.length) {
    let end = Math.min(start + CHUNK_SIZE, cleanedText.length);

    // Only try to find a nice break point if we're not at the end
    if (end < cleanedText.length) {
      // Try paragraph boundary first
      const paragraphBreak = cleanedText.lastIndexOf("\n\n", end);
      if (paragraphBreak > start + CHUNK_SIZE / 2) {
        end = paragraphBreak;
      } else {
        // Try sentence boundary
        const sentenceBreak = cleanedText.lastIndexOf(". ", end);
        if (sentenceBreak > start + CHUNK_SIZE / 2) {
          end = sentenceBreak + 1;
        }
        // Otherwise just cut at CHUNK_SIZE
      }
    }

    const chunk = cleanedText.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ content: chunk, index });
      index++;
    }

    // Move forward: end minus overlap, but always advance at least past half the chunk
    const minAdvance = Math.max(end - CHUNK_OVERLAP, start + CHUNK_SIZE / 2);
    start = Math.min(minAdvance, end);
  }

  return chunks;
}
