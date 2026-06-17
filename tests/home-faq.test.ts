import { describe, expect, it } from 'vitest';
import { HOME_FAQ } from '@/lib/home-faq';

describe('home faq', () => {
  it('covers SEO queries for simulator and custom roster flows', () => {
    const text = HOME_FAQ.map((entry) => `${entry.question} ${entry.answer}`).join(' ');

    expect(text).toContain('simulador de Los Juegos del Hambre');
    expect(text).toContain('Hunger Games simulator');
    expect(text).toContain('nombres personalizados');
    expect(text).toContain('roster aleatorio');
  });
});
