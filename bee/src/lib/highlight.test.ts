import { describe, expect, it } from 'vitest';

import { highlightCode } from './highlight';

describe('highlightCode', () => {
  it('escapes text when the language is unknown', () => {
    expect(highlightCode('<script>alert(1)</script>', 'nope')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('escapes text when no language is given', () => {
    expect(highlightCode('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d');
  });

  it('highlights a known language into spans without leaking raw html', () => {
    const html = highlightCode('const x = "<b>";', 'javascript');
    expect(html).toContain('hljs-keyword');
    expect(html).not.toContain('<b>');
  });
});
