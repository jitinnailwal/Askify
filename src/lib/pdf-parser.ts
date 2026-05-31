// Import the internal lib directly instead of the package entrypoint.
// pdf-parse's index.js runs a debug block on load that reads a bundled
// test PDF when `module.parent` is undefined (which happens under bundling),
// crashing with ENOENT. The lib module has no such side effect.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export async function parsePDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export function parseText(content: string): string {
  return content.trim();
}
