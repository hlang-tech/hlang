# Magic UI source

Copied from `~/a-github/magicui/apps/www/registry/magicui/` at revision
`efe76fc5755eca1142dd4f74c1d6f0ace2887e3c`, the same revision the AStack website uses.

| Component            | Use                                                              |
| -------------------- | ---------------------------------------------------------------- |
| AnimatedThemeToggler | Persisted light and dark choice with a circular reveal           |
| MagicCard            | Pointer-following silver light on the four program states        |
| BorderBeam           | One pass around the Writable node when a value arrives           |

The MIT license (`LICENSE.md`) keeps the upstream copyright.

Local adaptations:

- Strict TypeScript and the site's ESLint rules: explicit `String()` in template
  literals, braces on every block, bracket access for dataset keys.
- The theme toggler draws its sun and moon inline instead of importing an icon
  library.
- Colors are the site's semantic tokens, so every component follows the theme.
- Reduced motion disables the theme reveal, the pointer light and the border
  pass. Nothing repeats forever: the border pass runs once per real event.
