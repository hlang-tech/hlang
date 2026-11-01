import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTheme } from './theme';
import { KIND_TOKEN, TOKEN_NAMES, tokenVar } from './tokens';

/** The custom properties tokens.css declares, the tokens' single source of truth. */
function declaredTokens(): string[] {
  const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
  return [...new Set([...css.matchAll(/(--hl-[a-z0-9-]+)\s*:/g)].map((match) => (match[1] ?? '').slice(2)))];
}

describe('tokens', () => {
  it('names exactly the custom properties tokens.css declares', () => {
    expect([...TOKEN_NAMES].sort()).toEqual(declaredTokens().sort());
  });

  it('refers to tokens through var()', () => {
    expect(tokenVar('hl-silver')).toBe('var(--hl-silver)');
    expect(Object.values(KIND_TOKEN).every((value) => /^var\(--hl-[a-z0-9-]+\)$/.test(value))).toBe(true);
  });
});

describe('createTheme', () => {
  it('turns the given overrides into custom properties and skips undefined ones', () => {
    expect(createTheme({ 'hl-silver': '#d8dce4', 'hl-void': undefined })).toEqual({ '--hl-silver': '#d8dce4' });
  });
});
