/**
 * Syntax highlighting with Shiki and the site's own theme. Every color is a CSS
 * variable (`--code-*` in globals.css) with a light and a dark value, so code
 * follows the theme. Each role has its own color, checked for at least 4.5:1
 * contrast on the code surfaces in both themes.
 */

import { createHighlighter } from 'shiki';
import type { BundledLanguage, BundledTheme, HighlighterGeneric, ThemeRegistration } from 'shiki';

const color = (role: string): string => `var(--code-${role})`;

export const HLANG_THEME: ThemeRegistration = {
  name: 'hlang',
  type: 'dark',
  colors: { 'editor.background': color('bg'), 'editor.foreground': color('fg') },
  tokenColors: [
    { settings: { foreground: color('fg') } },
    { scope: ['comment', 'punctuation.definition.comment', 'string.quoted.docstring.multi'], settings: { foreground: color('comment'), fontStyle: 'italic' } },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'variable.language.this', 'variable.language.super'],
      settings: { foreground: color('keyword') },
    },
    { scope: ['keyword.operator', 'punctuation', 'meta.brace', 'meta.delimiter'], settings: { foreground: color('punctuation') } },
    { scope: ['string', 'string.template', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: color('string') } },
    { scope: ['punctuation.definition.template-expression', 'punctuation.section.embedded'], settings: { foreground: color('keyword') } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant.other', 'variable.other.constant'], settings: { foreground: color('constant') } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function', 'variable.function'], settings: { foreground: color('function') } },
    {
      scope: ['entity.name.type', 'entity.name.class', 'entity.other.inherited-class', 'support.class', 'support.type', 'meta.type.annotation entity.name.type', 'storage.type.primitive'],
      settings: { foreground: color('type') },
    },
    { scope: ['variable.parameter', 'meta.parameters variable'], settings: { foreground: color('parameter') } },
    {
      scope: ['variable.other.property', 'variable.other.object.property', 'meta.object-literal.key', 'support.type.property-name', 'support.variable.property'],
      settings: { foreground: color('property') },
    },
    { scope: ['markup.inserted', 'punctuation.definition.inserted'], settings: { foreground: color('string') } },
    { scope: ['markup.deleted', 'punctuation.definition.deleted'], settings: { foreground: color('constant') } },
  ],
};

const LANGS = ['ts', 'tsx', 'js', 'json', 'sh', 'bash', 'diff'] as const;

type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

let highlighter: Promise<Highlighter> | undefined;

export function getHighlighter(): Promise<Highlighter> {
  const pending = highlighter ?? createHighlighter({ themes: [HLANG_THEME], langs: [...LANGS] });
  highlighter = pending;
  return pending;
}

/** Highlight `code` to HTML. */
export async function highlight(code: string, lang: string): Promise<string> {
  const instance = await getHighlighter();
  const known = instance.getLoadedLanguages().find(loaded => loaded === lang) ?? 'text';
  return instance.codeToHtml(code, { lang: known, theme: 'hlang' });
}
