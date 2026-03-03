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

export function ThemeHeader() {
  const [theme, setTheme] = useState<LobbyTheme>(DEFAULT_LOBBY_THEME);
  const pathname = usePathname();

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

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Hunger Games
        </Link>

        <div className={styles.themes} aria-label="Selector global de tema">
          {LOBBY_THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.chip} ${theme === option.id ? styles.chipActive : ''}`}
              onClick={() => onSwapTheme(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <nav className={styles.links} aria-label="Navegacion principal">
          <Link
            href="/"
            className={`${styles.navLink} ${pathname === '/' ? styles.navLinkActive : ''}`}
          >
            Lobby
          </Link>
          <Link
            href="/new"
            className={`${styles.navLink} ${pathname.startsWith('/new') || pathname.startsWith('/session/') ? styles.navLinkActive : ''}`}
          >
            Nueva
          </Link>
          <Link
            href="/matches"
            className={`${styles.navLink} ${pathname === '/matches' ? styles.navLinkActive : ''}`}
          >
            Historial
          </Link>
        </nav>
      </div>
    </header>
  );
}
