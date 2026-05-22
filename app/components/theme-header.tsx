'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './theme-header.module.css';
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
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Hunger Games
        </Link>

        <nav className={styles.links} aria-label="Navegacion principal">
          <Link
            href="/"
            className={`${styles.navLink} ${pathname === '/' ? styles.navLinkActive : ''}`}
          >
            Lobby
          </Link>
          <Link
            href="/new"
            className={`${styles.navLink} ${pathname.startsWith('/new') || pathname.startsWith('/sessions/') ? styles.navLinkActive : ''}`}
          >
            Nueva
          </Link>
          <Link
            href="/sessions"
            className={`${styles.navLink} ${pathname === '/sessions' ? styles.navLinkActive : ''}`}
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
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <label className={styles.themeField}>
          <span className={styles.themeLabel}>Tema</span>
          <select
            className={styles.themeSelect}
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
