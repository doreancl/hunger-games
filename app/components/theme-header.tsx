'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_LOBBY_THEME,
  isLobbyTheme,
  LOBBY_THEMES,
  LOBBY_THEME_STORAGE_KEY,
  type LobbyTheme
} from '@/lib/lobby-theme';

function applyTheme(theme: LobbyTheme): void {
  document.documentElement.setAttribute('data-lobby-theme', theme);
}

function useLobbyTheme(): {
  theme: LobbyTheme;
  onSwapTheme: (nextTheme: LobbyTheme) => void;
} {
  const [theme, setTheme] = useState<LobbyTheme>(DEFAULT_LOBBY_THEME);

  useEffect(() => {
    const raw = window.localStorage.getItem(LOBBY_THEME_STORAGE_KEY);
    if (!raw || !isLobbyTheme(raw)) {
      applyTheme(DEFAULT_LOBBY_THEME);
      return;
    }

    setTheme(raw);
    applyTheme(raw);
  }, []);

  function onSwapTheme(nextTheme: LobbyTheme): void {
    setTheme(nextTheme);
    window.localStorage.setItem(LOBBY_THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return { theme, onSwapTheme };
}

export function ThemeHeader() {
  const pathname = usePathname();

  return (
    <header className="static bg-background transition-colors">
      <div className="flex  flex-wrap items-end gap-3 px-7 pb-5 pt-6">
        <Link
          href="/"
          className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Hunger Games
        </Link>

        <nav className="ml-auto flex flex-wrap gap-1.5" aria-label="Navegacion principal">
          <Link
            href="/"
            className={cn(
              'rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              (pathname === '/' || pathname.startsWith('/sessions/')) &&
                'border border-primary/30 bg-primary/10 text-primary'
            )}
          >
            Nueva
          </Link>
          <Link
            href="/sessions"
            className={cn(
              'rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              pathname === '/sessions' && 'border border-primary/30 bg-primary/10 text-primary'
            )}
          >
            Historial
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function ThemeFooter() {
  const { theme, onSwapTheme } = useLobbyTheme();

  return (
    <footer className="border-t bg-background transition-colors">
      <div className="mx-auto flex max-w-[1180px] justify-end px-3 py-3.5 max-[900px]:justify-stretch">
        <label className="flex items-center gap-2 text-[0.74rem] font-semibold text-muted-foreground max-[900px]:w-full">
          <span className="uppercase tracking-[0.04em]">Tema</span>
          <select
            className="min-w-[180px] cursor-pointer rounded-lg border bg-card py-1.5 pl-2.5 pr-8 text-[0.78rem] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring max-[900px]:w-full"
            value={theme}
            onChange={(event) => {
              const nextTheme = event.target.value;
              if (isLobbyTheme(nextTheme)) {
                onSwapTheme(nextTheme);
              }
            }}
            aria-label="Selector global de tema"
          >
            {LOBBY_THEMES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </footer>
  );
}
