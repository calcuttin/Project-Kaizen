import { describe, expect, it } from 'vitest';
import { cleanTitle } from './notionImport';

describe('imported feed titles', () => {
  it('decodes supported entities exactly once', () => {
    expect(cleanTitle('Tom &amp; &quot;Jerry&quot;&#39;s')).toBe('Tom & "Jerry"\'s');
    expect(cleanTitle('&amp;quot; &amp;#39; &amp;amp;')).toBe('&quot; &#39; &amp;');
    expect(cleanTitle('&lt;script&gt;')).toBe('&lt;script&gt;');
  });

  it('retains title cleanup and length limits', () => {
    expect(cleanTitle('(12) Example &amp; title - YouTube')).toBe('Example & title');
    expect(cleanTitle('https://example.com/article')).toBe('Link · example.com');
    expect(cleanTitle('a'.repeat(141))).toBe('a'.repeat(120) + '…');
  });
});
