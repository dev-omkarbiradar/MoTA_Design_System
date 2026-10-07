# MoTA Design System

The visual language of the Ministry of Tribal Affairs website, packaged as plain HTML, CSS and JavaScript. It lets any Ministry application be redesigned to the same look, including ASP.NET (MVC, Razor Pages, Web Forms, Blazor), Angular, Java and plain HTML.

- **DBIM v3.0**: the State Emblem, Noto Sans, the six colour groups, DBIM icons and the Template 1 layout
- **GIGW 3.0 and WCAG 2.1 AA**: contrast, keyboard use, screen readers, text resize and an accessibility panel
- **Framework-free**: class names (`ds-…`) and data attributes only; it works beside Bootstrap or a component library
- **Self-hosted and secure**: no CDN and no external requests, and it works with a strict Content-Security-Policy

## Quick start

1. Copy `dist/` into your application, for example to `wwwroot/lib/mota-ds/`.
2. In the page layout:

   ```html
   <html lang="en" data-ds-colour="forest-green">
   <link rel="stylesheet" href="/lib/mota-ds/css/mota-ds.min.css">
   <link rel="stylesheet" href="/lib/mota-ds/css/mota-ds-icons.css">
   …
   <script src="/lib/mota-ds/js/mota-ds.js" defer></script>
   ```

3. Start from a template in `templates/`, or copy components from the documentation.

## Viewing the documentation

Browsers block fonts and icons on pages opened straight from disk, so use the bundled preview server (Node.js 18 or later; nothing to install):

```
node serve.mjs
```

Then open http://localhost:4300. These pages are available:

| Page | Contents |
| --- | --- |
| `index.html` | Overview, quick start, template gallery |
| `docs/foundations.html` | Colour themes, type, spacing, shape, layout, icon finder |
| `docs/components.html` | Every component with a live example and copyable code |
| `docs/accessibility.html` | GIGW 3.0 checklist and testing guidance |
| `docs/integration.html` | ASP.NET Core, Web Forms, Blazor, Angular, Java, theming, CSP and script reference |

## Templates

| File | Page |
| --- | --- |
| `templates/home.html` | Portal home page (header with mega menus, banner, announcements, tiles, tabs, documents, footer) |
| `templates/content.html` | Inner content page with section tabs and a side column |
| `templates/listing.html` | Documents and listings: filters, document rows, pagination, sortable table |
| `templates/form.html` | Multi-step application form with validation, upload and captcha |
| `templates/login.html` | Sign-in |
| `templates/dashboard.html` | Back-office dashboard (NISG SARAL layout) |
| `templates/404.html` | Page not found |

## Folder layout

```
Design system/
├── dist/                 ← copy this into applications
│   ├── css/mota-ds.min.css        all styles
│   ├── css/mota-ds-icons.css      core icons (embedded)
│   ├── css/mota-ds-icons-all.css  all 229 icons (loads dist/icons/*.svg)
│   ├── js/mota-ds.js              behaviour (no dependencies)
│   ├── fonts/                     Noto Sans, Noto Sans Oriya, Allura (+ OFL licences)
│   ├── icons/                     DBIM icons as SVG
│   └── img/                       emblem, partner logos, artwork, banners
├── templates/            complete pages to copy from
├── docs/                 documentation
├── src/                  source CSS, JS and icons
├── build.mjs             rebuilds dist/ (node build.mjs)
└── serve.mjs             local preview server
```

## Changing the design system

Edit files in `src/`, run `node build.mjs`, check the documentation and templates, then copy the new `dist/` to applications. Don't edit `dist/` inside an application. Put application-specific styles in a separate stylesheet that uses the tokens (`var(--ds-key)`, `var(--ds-space-4)` …).

Versions follow semantic versioning: class names, data attributes and tokens are the public interface. Minor versions only add; renaming or removing anything needs a major version.

## Licences

- Noto Sans, Noto Sans Oriya and Allura are licensed under the SIL Open Font License; see `dist/fonts/`.
- The DBIM icons and logos come from the Digital Brand Identity Manual ToolKit for Government of India websites.
- The dashboard welcome illustration is from the Sneat admin template (MIT licence); see `dist/img/welcome-LICENSE.txt`.
- Use of the State Emblem of India is governed by the State Emblem of India (Prohibition of Improper Use) Act, 2005.
