# Source File Patterns by Framework & Platform

When fixing accessibility issues, use these patterns to locate the correct source files based on the detected framework or CMS. The scanner auto-detects the platform — check the `projectContext.framework` field in the findings.

## Next.js

| Type | Search in |
|------|-----------|
| Components | `app/**/*.tsx`, `components/**/*.tsx` |
| Pages/Routes | `app/**/page.tsx`, `app/**/layout.tsx` |
| Styles | `app/globals.css`, `**/*.module.css` |

## Nuxt

| Type | Search in |
|------|-----------|
| Components | `components/**/*.vue`, `pages/**/*.vue` |
| Layouts | `layouts/**/*.vue` |
| Styles | `assets/**/*.scss`, `assets/**/*.css` |

## React (generic)

| Type | Search in |
|------|-----------|
| Components | `src/**/*.tsx`, `src/**/*.jsx` |
| Styles | `src/**/*.css`, `src/**/*.module.css` |

## Vue (generic)

| Type | Search in |
|------|-----------|
| Components | `src/**/*.vue` |
| Styles | `src/**/*.css` |

## Angular

| Type | Search in |
|------|-----------|
| Components | `src/**/*.component.html`, `src/**/*.component.ts` |
| Styles | `src/**/*.component.css`, `src/styles.css` |

## Astro

| Type | Search in |
|------|-----------|
| Components | `src/**/*.astro`, `src/components/**/*.tsx` |
| Pages | `src/pages/**/*.astro` |
| Styles | `src/**/*.css` |

## Gatsby

| Type | Search in |
|------|-----------|
| Components | `src/**/*.tsx`, `src/**/*.jsx` |
| Pages | `src/pages/**/*.tsx` |
| Styles | `src/**/*.css`, `src/**/*.module.css` |

## Svelte

| Type | Search in |
|------|-----------|
| Components | `src/**/*.svelte` |
| Styles | `src/**/*.css` |

## Shopify (Liquid)

| Type | Search in |
|------|-----------|
| Sections | `sections/**/*.liquid` |
| Snippets | `snippets/**/*.liquid` |
| Templates | `templates/**/*.liquid`, `templates/**/*.json` |
| Layout | `layout/**/*.liquid` |
| Styles | `assets/**/*.css` |

Do not modify `config/settings_schema.json` or theme settings during fixes.

## WordPress (PHP)

| Type | Search in |
|------|-----------|
| Templates | `wp-content/themes/<active-theme>/**/*.php` |
| Template parts | `wp-content/themes/<active-theme>/template-parts/**/*.php` |
| Styles | `wp-content/themes/<active-theme>/**/*.css` |

## Drupal (Twig)

| Type | Search in |
|------|-----------|
| Templates | `web/themes/**/*.html.twig`, `themes/**/*.html.twig` |
| Template parts | `web/themes/**/*.twig`, `themes/**/*.twig` |
| Styles | `web/themes/**/*.css`, `themes/**/*.css` |

After changes, clear the Drupal cache: `drush cr`. Never edit compiled or cached files under `web/sites/default/files/`.

## Design Tokens (Tailwind CSS)

When fixing `color-contrast` or visual issues, check `package.json` for the Tailwind version:

- **v3**: tokens in `tailwind.config.ts` or `tailwind.config.js`.
- **v4**: tokens in `@theme { … }` blocks inside CSS files (e.g. `app/globals.css`). A `tailwind.config.js` may also exist with `@config` — check both. Never report a missing config as an error in v4 projects.
