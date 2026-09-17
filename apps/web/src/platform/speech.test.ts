import { describe, expect, it } from 'vitest';

import { pickVoice, splitSentences, stripForSpeech } from './speech';

function voices(list: Array<[string, string]>): SpeechSynthesisVoice[] {
  return list.map(([name, lang]) => ({ name, lang }) as unknown as SpeechSynthesisVoice);
}

describe('stripForSpeech', () => {
  it('removes markdown syntax', () => {
    expect(stripForSpeech('# Title\n**bold** and `code`')).toBe('Title bold and code');
  });

  it('drops images and unwraps links', () => {
    expect(stripForSpeech('see [docs](http://x) and ![img](y.png) now')).toBe('see docs and now');
  });

  it('replaces fenced code blocks', () => {
    expect(stripForSpeech('before ```js\nconst x = 1;\n``` after')).toBe('before code block after');
  });
});

describe('splitSentences', () => {
  it('splits on sentence punctuation', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });

  it('returns an empty list for blank input', () => {
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('pickVoice', () => {
  it('prefers a natural English voice', () => {
    const chosen = pickVoice(
      voices([
        ['Ting-Ting', 'zh-CN'],
        ['Microsoft Aria Online', 'en-US'],
        ['Zira', 'en-US'],
      ]),
    );
    expect(chosen?.name).toContain('Aria');
  });

  it('falls back to the first English voice, then any voice', () => {
    expect(pickVoice(voices([['Foo', 'en-GB']]))?.name).toBe('Foo');
    expect(pickVoice(voices([['Bar', 'fr-FR']]))?.name).toBe('Bar');
  });

  it('handles no voices', () => {
    expect(pickVoice([])).toBeUndefined();
  });
});
