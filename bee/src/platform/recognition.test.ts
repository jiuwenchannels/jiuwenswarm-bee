import { describe, expect, it } from 'vitest';

import {
  type RecognitionResultList,
  isRecognitionSupported,
  readTranscript,
  recognitionLang,
} from './recognition';

function results(list: Array<{ text: string; final: boolean }>): RecognitionResultList {
  return list.map((item) => {
    return {
      isFinal: item.final,
      length: 1,
      0: { transcript: item.text },
    };
  }) as unknown as RecognitionResultList;
}

describe('readTranscript', () => {
  it('splits final and interim text', () => {
    expect(
      readTranscript(
        results([
          { text: 'hello ', final: true },
          { text: 'wor', final: false },
        ]),
      ),
    ).toEqual({ final: 'hello', interim: 'wor' });
  });

  it('returns empty strings for no results', () => {
    expect(readTranscript(results([]))).toEqual({ final: '', interim: '' });
  });
});

describe('recognitionLang', () => {
  it('maps locales to BCP-47 tags', () => {
    expect(recognitionLang('zh')).toBe('zh-CN');
    expect(recognitionLang('en')).toBe('en-US');
  });
});

describe('isRecognitionSupported', () => {
  it('is false when the API is absent', () => {
    expect(isRecognitionSupported()).toBe(false);
  });
});
