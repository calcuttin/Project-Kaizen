import { expect, it } from 'vitest';
import { safeExternalUrl } from './urls';

it('blocks executable and embedded-document links from imported data', () => {
  for (const value of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///private/data', '//example.com']) expect(safeExternalUrl(value)).toBeUndefined();
  expect(safeExternalUrl('https://example.com/article?q=book')).toBe('https://example.com/article?q=book');
});
