import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { BeeAvatar } from './BeeAvatar';
import type { AvatarState } from '../../avatar/avatar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

function render(state: AvatarState, showLabel = true): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<BeeAvatar state={state} showLabel={showLabel} />);
  });
  return container;
}

afterEach(() => {
  container?.remove();
  container = null;
});

describe('BeeAvatar', () => {
  it('exposes its state as data-variant', () => {
    const node = render('thinking');
    expect(node.querySelector('[data-testid="bee-avatar"]')?.getAttribute('data-variant')).toBe('thinking');
  });

  it('shows a readable label for the state', () => {
    const node = render('error');
    expect(node.querySelector('[data-testid="bee-avatar-label"]')?.textContent).toContain('problem');
  });

  it('shows decorative companion bees ("one of the swarm")', () => {
    const node = render('idle');
    const swarm = node.querySelector('[data-testid="bee-swarm"]');
    expect(swarm).not.toBeNull();
    expect(swarm?.getAttribute('aria-hidden')).toBe('true');
  });

  it('can hide the state label (empty chat shows the greeting instead)', () => {
    const node = render('idle', false);
    expect(node.querySelector('[data-testid="bee-avatar-label"]')).toBeNull();
  });
});
