export const LOBBY_THEME_STORAGE_KEY = 'hg_lobby_theme';

export const LOBBY_THEMES = [
  { id: 'neon-future', label: 'Neon Futurista' },
  { id: 'retro-pixel', label: 'Retro Pixel' },
  { id: 'apple-bubbles', label: 'Bubble Glass' },
  { id: 'graphite-sport', label: 'Graphite Sport' },
  { id: 'forest-editorial', label: 'Forest Editorial' }
] as const;

export type LobbyTheme = (typeof LOBBY_THEMES)[number]['id'];

export const DEFAULT_LOBBY_THEME: LobbyTheme = 'neon-future';

export function isLobbyTheme(value: string): value is LobbyTheme {
  return LOBBY_THEMES.some((theme) => theme.id === value);
}
