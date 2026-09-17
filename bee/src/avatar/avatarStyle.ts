/** The assistant character can be rendered two ways; the choice is remembered. */
export type AvatarStyle = 'rigged' | 'mascot';

const STORAGE_KEY = 'beechat.avatarStyle';

export function loadAvatarStyle(): AvatarStyle {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'mascot' ? 'mascot' : 'rigged';
  } catch {
    return 'rigged';
  }
}

export function saveAvatarStyle(style: AvatarStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}
