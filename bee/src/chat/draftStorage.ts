const PREFIX = 'beechat.draft.';

export function loadDraft(key: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(PREFIX + key, value);
    else localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function clearDraft(key: string): void {
  saveDraft(key, '');
}
