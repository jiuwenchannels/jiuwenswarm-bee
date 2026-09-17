import { Download, Languages, MessageSquare, Plus, Search, Settings, SunMoon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLocaleContext, useStrings } from '../../i18n/LocaleContext';
import { useFocusTrap } from '../../lib/useFocusTrap';
import './CommandPalette.css';

interface Command {
  id: string;
  label: string;
  icon: typeof Plus;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onNewChat,
  onToggleTheme,
  onSwitchLanguage,
  onOpenSettings,
  onFocusComposer,
  onExport,
  onFind,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onToggleTheme: () => void;
  onSwitchLanguage: () => void;
  onOpenSettings: () => void;
  onFocusComposer: () => void;
  onExport: () => void;
  onFind: () => void;
}) {
  const t = useStrings();
  const { locale } = useLocaleContext();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  // Name the target language in its own script (autonym), so the entry is
  // readable even after switching to a language you cannot read.
  const nextLanguage = locale === 'zh' ? 'English' : '中文';

  const commands = useMemo<Command[]>(
    () => [
      { id: 'new', label: t.command.newChat, icon: Plus, run: onNewChat },
      { id: 'find', label: t.command.find, icon: Search, run: onFind },
      { id: 'export', label: t.command.export, icon: Download, run: onExport },
      { id: 'theme', label: t.command.toggleTheme, icon: SunMoon, run: onToggleTheme },
      {
        id: 'language',
        label: `${t.command.switchLanguage} · ${nextLanguage}`,
        icon: Languages,
        run: onSwitchLanguage,
      },
      { id: 'settings', label: t.command.openSettings, icon: Settings, run: onOpenSettings },
      { id: 'focus', label: t.command.focusComposer, icon: MessageSquare, run: onFocusComposer },
    ],
    [
      t,
      nextLanguage,
      onNewChat,
      onFind,
      onExport,
      onToggleTheme,
      onSwitchLanguage,
      onOpenSettings,
      onFocusComposer,
    ],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? commands.filter((command) => command.label.toLowerCase().includes(needle)) : commands;
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  function run(command: Command | undefined) {
    if (!command) return;
    command.run();
    onClose();
  }

  return (
    <div className="palette" data-testid="bee-palette">
      <div className="palette__backdrop" onClick={onClose} />
      <div className="palette__panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={t.command.title}>
        <div className="palette__search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.command.placeholder}
            aria-label={t.command.placeholder}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setIndex((value) => Math.min(value + 1, filtered.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setIndex((value) => Math.max(value - 1, 0));
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                run(filtered[index]);
              }
            }}
          />
        </div>
        <ul className="palette__list">
          {filtered.length === 0 ? (
            <li className="palette__empty">{t.command.noResults}</li>
          ) : (
            filtered.map((command, position) => {
              const Icon = command.icon;
              return (
                <li key={command.id}>
                  <button
                    className="palette__item"
                    type="button"
                    data-active={position === index ? 'true' : undefined}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => run(command)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {command.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
