const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+\d*);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const codePoint =
        entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const BLOCK_CLOSING_TAGS = /<\/(p|div|h[1-6]|li|tr|section|article|header|footer)>/gi;

/**
 * Renders fetched HTML (e.g. the hosted privacy policy page) as readable plain text.
 *
 * Decoding entities only after tags are stripped keeps an escaped `&lt;script&gt;` in the
 * source from turning into a real tag once decoded.
 */
export function stripHtmlToText(html: string): string {
  const withoutHiddenBlocks = html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  const withLineBreaks = withoutHiddenBlocks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(BLOCK_CLOSING_TAGS, '\n\n');

  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '');
  const decoded = decodeEntities(withoutTags);

  const lines: string[] = [];
  for (const rawLine of decoded.split('\n')) {
    const line = rawLine.trim();
    if (line === '' && lines[lines.length - 1] === '') continue;
    lines.push(line);
  }
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return lines.join('\n');
}
