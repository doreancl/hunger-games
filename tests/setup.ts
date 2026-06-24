import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
