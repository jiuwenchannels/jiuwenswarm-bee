/** The assistant avatar can be rendered two ways; the choice is remembered. */
export type AvatarStyle = 'mascot' | 'vector';

const STORAGE_KEY = 'beechat.avatarStyle';

export function loadAvatarStyle(): AvatarStyle {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'vector' ? 'vector' : 'mascot';
  } catch {
    return 'mascot';
  }
}

export function saveAvatarStyle(style: AvatarStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}

export const AVATAR_STYLE_LABEL: Record<AvatarStyle, string> = {
  mascot: 'Classic',
  vector: 'Animated',
};
