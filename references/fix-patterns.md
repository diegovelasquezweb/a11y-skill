# Fix Patterns

Remediation patterns organized by WCAG criterion. Each entry maps to one or more `rule_id` values the scanner produces. Use this file when proposing fixes in Step 4 — prefer the most specific pattern that matches the element's context.

---

## 1.1.1 Non-text Content

**Rules:** `image-alt`, `input-image-alt`, `svg-img-alt`, `role-img-alt`, `object-alt`

### Informative image — conveys content

```html
<!-- HTML -->
<img src="chart.png" alt="Revenue grew 42% year-over-year in Q1 2026">

<!-- React -->
<img src={chartSrc} alt="Revenue grew 42% year-over-year in Q1 2026" />
```

### Decorative image — adjacent text or purely visual

```html
<!-- HTML -->
<img src="divider.png" alt="">

<!-- React -->
<img src={dividerSrc} alt="" role="presentation" />
```

### Functional image — acts as a button or link

```html
<!-- HTML -->
<a href="/home"><img src="logo.png" alt="Acme Corp — Home"></a>

<!-- React -->
<a href="/home"><img src={logo} alt="Acme Corp — Home" /></a>
```

### Informative SVG

```html
<svg role="img" aria-label="Shopping cart — 3 items" focusable="false">
  <!-- paths -->
</svg>
```

### Decorative SVG

```html
<svg aria-hidden="true" focusable="false">
  <!-- paths -->
</svg>
```

### Input type image

```html
<input type="image" src="submit.png" alt="Submit order">
```

**Decision rule:** Ask — does removing this image lose information? If yes: describe the information in `alt`. If no: `alt=""`.

---

## 1.2.1 / 1.2.2 Time-based Media

**Rules:** `audio-caption`, `video-caption`

```html
<video controls>
  <source src="demo.mp4" type="video/mp4">
  <track kind="captions" src="demo.vtt" srclang="en" label="English" default>
</video>

<audio controls src="podcast.mp3">
  <track kind="captions" src="podcast.vtt" srclang="en" label="English" default>
</audio>
<!-- Alternative for audio: link to a text transcript adjacent to the player -->
```

---

## 1.3.1 Info and Relationships

**Rules:** `heading-order`, `page-has-heading-one`, `empty-heading`, `p-as-heading`, `list`, `listitem`, `definition-list`, `dlitem`, `td-has-header`, `th-has-data-cells`, `scope-attr-valid`

### Heading hierarchy — no levels skipped

```html
<h1>Product catalog</h1>
  <h2>Shoes</h2>
    <h3>Running</h3>
    <h3>Casual</h3>
  <h2>Bags</h2>
<!-- Never jump h1 → h3. Always increment by one. -->
```

### Paragraph styled as heading

```html
<!-- Before -->
<p class="text-2xl font-bold">Section title</p>

<!-- After -->
<h2>Section title</h2>
```

In React/CSS-in-JS: change the element type — do not style a `<p>` as a heading.

### List structure

```html
<!-- Before: div children in ul -->
<ul>
  <div class="item">Item 1</div>
</ul>

<!-- After -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### Data table with headers

```html
<table>
  <caption>Quarterly sales by region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North</th>
      <td>$100k</td>
      <td>$120k</td>
    </tr>
  </tbody>
</table>
```

`scope="col"` on column headers, `scope="row"` on row headers. Never put `scope` on `<td>`.

---

## 1.3.4 Orientation

**Rule:** `css-orientation-lock`

Remove CSS that locks to portrait or landscape. Use responsive layout instead of orientation transforms.

```css
/* Remove: */
/* @media (orientation: portrait) { body { transform: rotate(90deg); } } */

/* Use instead: */
@media (orientation: landscape) {
  .layout { grid-template-columns: 1fr 1fr; }
}
```

---

## 1.3.5 Identify Input Purpose

**Rule:** `autocomplete-valid`

```html
<input type="text"  name="name"    autocomplete="name">
<input type="email" name="email"   autocomplete="email">
<input type="tel"   name="phone"   autocomplete="tel">
<input type="text"  name="street"  autocomplete="street-address">
<input type="text"  name="city"    autocomplete="address-level2">
<input type="text"  name="country" autocomplete="country-name">
```

[Full token list](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values)

---

## 1.3.6 Identify Purpose

**Rules:** `landmark-one-main`, `landmark-unique`, `region`

Every page must have exactly one `<main>`. All visible content must be inside a landmark.

```html
<header>
  <a href="/">Logo</a>
  <nav aria-label="Primary navigation">...</nav>
</header>

<main id="main-content">
  <h1>Page heading</h1>
  <section aria-labelledby="section-id">
    <h2 id="section-id">Section</h2>
  </section>
</main>

<footer>
  <nav aria-label="Footer links">...</nav>
</footer>
```

When multiple `<nav>` or `<section>` elements exist, each must have a unique `aria-label`.

---

## 1.4.1 Use of Color

**Rule:** `link-in-text-block`

Links within a paragraph must be distinguishable without relying on color alone.

```css
/* Browser default underline is sufficient — do not remove it */
a { text-decoration: underline; }

/* If custom design removes underline, add a non-color cue on hover/focus */
a {
  text-decoration: none;
  border-bottom: 1px solid currentColor;
}
a:hover, a:focus {
  text-decoration: underline;
}
```

---

## 1.4.2 Audio Control

**Rule:** `no-autoplay-audio`

```html
<!-- Remove autoplay from audio with sound -->
<audio controls src="bg.mp3"></audio>

<!-- Background video: muted is acceptable -->
<video autoplay muted loop playsinline src="hero.mp4"></video>
```

---

## 1.4.3 Contrast

**Rule:** `color-contrast`

Minimum ratios: **4.5:1** for normal text, **3:1** for large text (≥18pt / ≥14pt bold), **3:1** for UI components.

```css
/* Use design tokens — fix at the token level, not per-component */
:root {
  --color-text-primary:    #1e293b; /* verify ≥4.5:1 on your background */
  --color-text-secondary:  #475569; /* verify ≥4.5:1 on your background */
  --color-text-disabled:   #94a3b8; /* disabled elements are exempt */
}
```

Check with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).

---

## 1.4.4 Resize Text

**Rule:** `meta-viewport`, `meta-viewport-large`

```html
<!-- Remove user-scalable=no -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Never use `user-scalable=no` or `maximum-scale=1`.

---

## 1.4.12 Text Spacing

**Rule:** `avoid-inline-spacing`

```html
<!-- Before: inline !important blocks user overrides -->
<p style="letter-spacing: 0.05em !important; line-height: 1.2 !important">Text</p>

<!-- After: stylesheet (user CSS can override) -->
<p class="body-text">Text</p>
```

```css
.body-text {
  letter-spacing: 0.05em;
  line-height: 1.5;
}
```

---

## 2.1.1 Keyboard

**Rule:** `scrollable-region-focusable`

```html
<div
  tabindex="0"
  role="region"
  aria-label="Product comparison table"
  style="overflow: auto;"
>
  <table>...</table>
</div>
```

---

## 2.2.1 Timing Adjustable

**Rule:** `meta-refresh`

```html
<!-- Remove timed refresh entirely -->
<!-- <meta http-equiv="refresh" content="30"> -->

<!-- Immediate redirect (delay=0) is permitted -->
<meta http-equiv="refresh" content="0; url=/new-page">
```

---

## 2.2.2 Pause, Stop, Hide

**Rules:** `blink`, `marquee`

Remove `<blink>` and `<marquee>` entirely. Use CSS animations with `prefers-reduced-motion` for any motion.

```css
.animated {
  animation: slide 3s infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animated { animation: none; }
}
```

---

## 2.4.1 Bypass Blocks

**Rules:** `bypass`, `skip-link`

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header>...</header>
  <main id="main-content" tabindex="-1">
    <h1>Page heading</h1>
  </main>
</body>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
}
.skip-link:focus {
  position: static;
  padding: 0.5rem 1rem;
  background: #000;
  color: #fff;
  z-index: 9999;
}
```

`tabindex="-1"` on `<main>` ensures Safari moves focus correctly when the skip link is activated.

---

## 2.4.2 Page Titled

**Rule:** `document-title`

```html
<title>Product Details — Acme Store</title>
<!-- Pattern: [Page name] — [Site name] -->
```

In SPAs, update `document.title` on every route change.

---

## 2.4.3 Focus Order

**Rules:** `tabindex`, `focus-order-semantics`

```html
<!-- Include in tab order: tabindex="0" -->
<div role="button" tabindex="0">Custom button</div>

<!-- Remove from tab order: tabindex="-1" -->
<div tabindex="-1">Script-only focus target</div>

<!-- Remove positive tabindex entirely — it breaks natural order -->
<!-- Never use tabindex="1", tabindex="2", etc. -->
```

Prefer semantic HTML over custom focusable elements. A `<button>` needs no `tabindex`.

---

## 2.4.4 Link Purpose

**Rules:** `link-name`, `area-alt`, `identical-links-same-purpose`

```html
<!-- Descriptive text -->
<a href="/docs/wcag">Read the WCAG 2.2 guidelines</a>

<!-- Icon-only link: use aria-label -->
<a href="/cart" aria-label="Shopping cart — 3 items">
  <svg aria-hidden="true">...</svg>
</a>

<!-- Multiple "Read more" links: differentiate with aria-label -->
<a href="/post-1" aria-label="Read more about accessibility audits">Read more</a>
<a href="/post-2" aria-label="Read more about inclusive design">Read more</a>
```

---

## 2.4.6 Headings and Labels

**Rule:** `empty-heading`

```html
<!-- Before -->
<h2></h2>

<!-- After: add content, or remove if structural-only -->
<h2>Customer reviews</h2>
```

---

## 2.5.3 Label in Name

**Rule:** `label-content-name-mismatch`

The accessible name must contain the visible label text. Voice control users speak what they see.

```html
<!-- Good: accessible name matches visible text -->
<button>Search products</button>

<!-- Good: aria-label starts with visible text -->
<button aria-label="Search products in current category">Search products</button>

<!-- Bad: aria-label replaces visible text entirely -->
<!-- <button aria-label="Execute query">Search products</button> -->
```

---

## 2.5.8 Target Size

**Rule:** `target-size`

Minimum 24×24 CSS px (WCAG 2.2 AA). Recommended 44×44 px for touch.

```css
button, a, [role="button"], [role="link"] {
  min-width:  44px;
  min-height: 44px;
}

/* Inline links exempt if not surrounded by other targets */
```

---

## 3.1.1 Language of Page

**Rules:** `html-has-lang`, `html-lang-valid`

```html
<html lang="en">       <!-- English -->
<html lang="es">       <!-- Spanish -->
<html lang="fr-CA">    <!-- French Canadian -->
<html lang="pt-BR">    <!-- Brazilian Portuguese -->
```

Use a valid [BCP 47](https://r12a.github.io/app-subtags/) subtag.

---

## 3.1.2 Language of Parts

**Rule:** `valid-lang`

```html
<p>The French phrase <span lang="fr">c'est la vie</span> means "that's life".</p>
```

---

## 3.3.2 Labels or Instructions

**Rules:** `label`, `label-title-only`, `select-name`, `form-field-multiple-labels`

```html
<!-- Explicit label (preferred) -->
<label for="email">Email address</label>
<input id="email" type="email" name="email" autocomplete="email">

<!-- Select -->
<label for="country">Country</label>
<select id="country" name="country">
  <option value="us">United States</option>
</select>

<!-- Do not rely on title or placeholder alone -->
<!-- <input title="Email"> — not reliable across AT -->
<!-- <input placeholder="Email"> — disappears on input -->
```

In React: use `htmlFor` instead of `for`.

```jsx
<label htmlFor="email">Email address</label>
<input id="email" type="email" />
```

---

## 4.1.2 Name, Role, Value

**Rules:** `button-name`, `input-button-name`, `select-name`, `aria-hidden-focus`, `aria-hidden-body`, `nested-interactive`, `duplicate-id`, `duplicate-id-aria`, `frame-title`, `aria-required-attr`, `aria-required-children`

### Button accessible name

```html
<!-- Visible text (preferred) -->
<button type="button">Add to cart</button>

<!-- Icon-only: aria-label -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- input buttons -->
<input type="submit" value="Submit order">
```

### aria-hidden on focusable elements

```html
<!-- Wrong: aria-hidden on a focusable element -->
<!-- <button aria-hidden="true">Submit</button> -->

<!-- Fix option 1: remove aria-hidden -->
<button>Submit</button>

<!-- Fix option 2: keep hidden, remove from tab order -->
<div aria-hidden="true" tabindex="-1">Decorative</div>
```

Never set `aria-hidden="true"` on `<body>`.

### Nested interactive elements

```html
<!-- Wrong: button inside link -->
<!-- <a href="/product"><button>Buy</button></a> -->

<!-- Fix: separate elements -->
<div class="product-card">
  <a href="/product">Product name</a>
  <button type="button">Add to cart</button>
</div>
```

### Unique IDs

Every `id` must be unique per page. IDs used by `aria-labelledby`, `aria-describedby`, or `aria-controls` must resolve to exactly one element.

```html
<!-- Before: duplicate id breaks aria-labelledby -->
<!-- <span id="label">Email</span> ... <span id="label">Name</span> -->

<!-- After: unique ids -->
<span id="email-label">Email</span>
<input aria-labelledby="email-label" type="email">

<span id="name-label">Full name</span>
<input aria-labelledby="name-label" type="text">
```

### iframe title

```html
<iframe
  title="Map showing our Toronto office location"
  src="https://maps.example.com/embed"
  loading="lazy"
></iframe>
```

### Required ARIA attributes

| Role | Required attributes |
|---|---|
| `combobox` | `aria-expanded`, `aria-controls` |
| `slider` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `checkbox` | `aria-checked` |
| `progressbar` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `tablist` | children must have `role="tab"` |
| `list` (ARIA) | children must have `role="listitem"` |

```html
<!-- slider -->
<div
  role="slider"
  aria-valuenow="30"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Volume"
  tabindex="0"
></div>
```
