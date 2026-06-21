# HTML & CSS Tutorial — Speech Recording Tool

This tutorial explains the main HTML and CSS structure of the speech recording tool.

The relevant files are:

```text
index.html
css/styles.css
```

The HTML file contains the structure of the page. It defines the screens, headings, forms, buttons, links, and accessibility landmarks.

The CSS file controls the appearance of the page. It defines the layout, colours, typography, responsive breakpoints, focus styles, cards, buttons, forms, upload overlay, and final confetti animation.

---

## Part 1 — The document shell

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">

  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>Speech Recording / Sprachaufnahme</title>

  <meta name="description" content="A browser-based bilingual speech recording tool for phonetic research, developed for a web design project at the University of Graz.">

  <link rel="stylesheet" href="css/styles.css">
</head>
```

`<!doctype html>` must be the first line of a modern HTML document. It tells the browser to use modern HTML5 rendering.

`<html lang="en">` is the root element of the page. The `lang` attribute tells browsers and screen readers which language the page is in. The page starts in English because the first screen is bilingual and the final language is set after the participant selects their group.

`<meta charset="utf-8">` sets the character encoding to UTF-8. This is important because the project uses German characters such as ä, ö, ü, and ß, as well as emoji flags and confetti symbols.

`<meta name="viewport" content="width=device-width, initial-scale=1">` makes the page scale correctly on mobile devices. Without this line, mobile browsers may render the page as if it were a desktop website and then shrink it down.

`<title>` sets the text shown in the browser tab.

`<meta name="description">` gives a short description of the page. This was added because the assignment explicitly requires a meta description.

`<link rel="stylesheet" href="css/styles.css">` connects the HTML file to the external CSS file. The styling is not embedded directly in the HTML.

---

## Part 2 — Skip link

```html
<a class="skip-link" href="#main-content">Skip to main content</a>
```

The skip link is the first interactive element on the page. It lets keyboard users skip directly to the main content instead of tabbing through repeated header elements.

The matching CSS is:

```css
.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  background: var(--uni-yellow);
  color: var(--uni-black);
  font-weight: 700;
  padding: 10px 16px;
  text-decoration: none;
  z-index: 10000;
  transition: top .15s;
}

.skip-link:focus {
  top: 0;
}
```

The link is normally moved above the visible page with `top: -100px`.

When it receives keyboard focus, `top: 0` moves it into view.

This is an accessibility feature related to bypassing repeated content.

---

## Part 3 — Visually hidden text

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

The `.visually-hidden` class hides text visually while keeping it available to screen readers.

This is useful when a heading is needed for semantic structure but should not be visible in the interface.

For example, the main app flow can have a hidden heading:

```html
<article class="app-flow" aria-labelledby="appFlowTitle">
  <h2 id="appFlowTitle" class="visually-hidden">
    Speech recording workflow / Ablauf der Sprachaufnahme
  </h2>
</article>
```

This improves structure without adding extra visible text to the design.

---

## Part 4 — Colour tokens

```css
:root {
  --uni-yellow: #ffd500;
  --uni-black: #000000;
  --white: #ffffff;
  --muted: #444444;
  --border: #e6e6e6;
  --pill-bg: #f7f7f7;
  --shadow: 0 10px 30px rgba(0,0,0,.08);
  --radius-card: 16px;
  --radius-input: 10px;
}
```

CSS custom properties are also called CSS variables. They start with `--`.

The variables are defined in `:root`, which means they are available throughout the whole CSS file.

For example:

```css
background: var(--uni-yellow);
```

uses the yellow value defined at the top.

This makes the design easier to maintain. If the accent colour changes, it only needs to be changed once.

The project uses University of Graz yellow as the main accent colour, with black text and white or pale grey backgrounds.

---

## Part 5 — Reset and base styles

```css
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--white);
  color: var(--uni-black);
  font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
}
```

`*` targets every element on the page.

`box-sizing: border-box` changes how element width is calculated. With this setting, padding and borders are included inside the element width. This helps prevent accidental horizontal overflow.

`margin: 0` and `padding: 0` remove the browser’s default spacing around the page.

The font stack uses `Inter` first, then system fonts as fallbacks. This keeps the design clean and avoids requiring a custom font file.

`line-height: 1.5` improves readability by giving text enough vertical spacing.

---

## Part 6 — Main layout

```html
<div class="wrap">
  <div class="card">
    ...
  </div>
</div>
```

The outer page layout is controlled by `.wrap` and `.card`.

```css
.wrap {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px;
}

.card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
  padding: 28px;
}
```

`.wrap` centres the content and prevents it from becoming too wide on large screens.

`margin: 0 auto` centres the wrapper horizontally.

`.card` creates the main white content box. It uses a border, rounded corners, and a soft shadow.

The interface is a guided recording task, so a single-card layout helps participants understand that they are moving through one coherent process.

---

## Part 7 — Responsive layout for small screens

```css
@media (max-width: 600px) {
  .card {
    padding: 18px 14px;
  }

  .wrap {
    padding: 12px 10px;
  }
}
```

This media query applies only when the screen is 600px wide or narrower.

On smaller screens, the card and wrapper padding are reduced. This gives the content more available space on mobile devices.

This is part of the responsive design strategy. The page keeps the same overall structure, but spacing and grids adapt to smaller screens.

---

## Part 8 — Semantic page structure

The final HTML uses semantic landmarks:

```html
<header class="site-header">
  ...
</header>

<main id="main-content">
  <article class="app-flow" aria-labelledby="appFlowTitle">
    ...
  </article>
</main>

<footer class="site-footer">
  ...
</footer>
```

`<header>` contains the site title and logo.

`<main>` contains the main interactive content of the page.

`<article>` wraps the speech recording workflow as one self-contained application.

`<footer>` contains the imprint link.

This semantic structure helps browsers, screen readers, validators, and humans understand the page.

---

## Part 9 — Shared header

```html
<header class="site-header">
  <h1 id="headerTitle">Speech Recording</h1>

  <img
    class="uni-logo"
    src="img/logo_uni_graz_4c.jpg"
    alt="University of Graz"
  >
</header>
```

The header appears above the app screens.

It contains the only visible `<h1>` on the page and the University of Graz logo.

```css
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.site-header h1 {
  margin: 0;
  font-size: 22px;
}

.uni-logo {
  height: 40px;
  width: auto;
  border-radius: 6px;
}
```

`display: flex` places the title and logo in one row.

`justify-content: space-between` pushes the title to the left and the logo to the right.

`align-items: center` aligns both vertically.

The logo uses `alt="University of Graz"` so screen readers can identify it.

---

## Part 10 — Header responsiveness

```css
@media (max-width: 420px) {
  .site-header h1 {
    font-size: 18px;
  }

  .uni-logo {
    height: 32px;
  }
}
```

On very narrow screens, the title and logo become slightly smaller.

This prevents the header from feeling cramped on mobile devices.

---

## Part 11 — Footer

```html
<footer class="site-footer">
  <nav aria-label="Site links">
    <a href="imprint.html">Impressum / Imprint</a>
  </nav>
</footer>
```

The footer contains a navigation landmark with a link to the imprint page.

```css
.site-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  text-align: center;
}

.site-footer a {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
}

.site-footer a:hover {
  text-decoration: underline;
}
```

The footer is styled through the external CSS file. There are no inline styles here.

The `<nav>` element is given `aria-label="Site links"` so assistive technologies know what kind of navigation this is.

---

## Part 12 — Typography

```css
h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

h3 {
  margin: 0 0 6px;
  font-size: 17px;
}

p {
  margin: 0 0 10px;
  color: var(--muted);
}

ul {
  margin: 6px 0 10px 20px;
  color: var(--muted);
}

li {
  margin: 4px 0;
}

.subtitle {
  color: var(--muted);
}

.footnote {
  font-size: 12px;
  color: var(--muted);
  margin-top: 14px;
}

.muted {
  color: var(--muted);
  font-size: 13px;
}

.req {
  color: #c00;
}
```

The typography rules keep headings, paragraphs, lists, subtitles, and footnotes consistent.

The `.muted` class is used for secondary text.

The `.req` class marks required fields with a red asterisk.

---

## Part 13 — Screen system

```css
.screen {
  display: none;
}

.screen.active {
  display: block;
}
```

All screens are present in `index.html`, but only one screen should be visible at a time.

By default, `.screen` elements are hidden with `display: none`.

When JavaScript adds the `active` class, the screen becomes visible.

Example:

```html
<section id="scr-group" class="screen active">
  ...
</section>

<section id="scr-consent" class="screen">
  ...
</section>
```

The first screen starts active. JavaScript later removes and adds the `active` class to move through the app.

This is how the website behaves like a single-page application without reloading the page.

---

## Part 14 — Rows and grids

```css
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 10px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 10px;
}

.full {
  grid-column: 1 / -1;
}
```

`.row` is used when buttons or controls should sit next to each other.

`flex-wrap: wrap` lets items move onto a new line when there is not enough space.

`.grid-2` creates two equal columns.

`.grid-3` creates three equal columns.

`.full` makes an element span across all columns.

---

## Part 15 — Responsive grids

```css
@media (max-width: 600px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
```

On smaller screens, two-column and three-column grids collapse into a single column.

This prevents form fields and cards from becoming too narrow on mobile devices.

---

## Part 16 — Form elements

```css
label {
  display: block;
  margin: 12px 0 5px;
  font-weight: 600;
  font-size: 14px;
}

input,
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-family: inherit;
  font-size: 15px;
  background: var(--white);
  color: var(--uni-black);
  min-height: 44px;
}
```

Labels are displayed as block elements so they sit above form fields.

Inputs, selects, and text areas fill the available width.

`font-family: inherit` makes form elements use the same font as the rest of the page.

`min-height: 44px` helps make form fields easier to use on touchscreens.

---

## Part 17 — Focus styles

```css
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid var(--uni-yellow);
  outline-offset: 2px;
}
```

This rule creates a visible yellow focus outline for form fields.

Focus styles are important for keyboard navigation. They show which element is currently active.

`outline-offset: 2px` places the outline slightly outside the element border, making it easier to see.

---

## Part 18 — Checkboxes and radio buttons

```css
input[type="checkbox"],
input[type="radio"] {
  width: auto !important;
  min-height: auto;
  background: transparent !important;
  border: none !important;
  box-sizing: content-box !important;
  margin: 0 !important;
  width: 20px !important;
  height: 20px !important;
  cursor: pointer;
}
```

The general input rule makes normal fields full width. That would look wrong for checkboxes and radio buttons.

This rule overrides the general input styles for checkboxes and radio buttons.

They are kept at 20px by 20px and remain easy to click.

---

## Part 19 — Fieldsets and legends

```css
fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

legend {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
  padding: 0;
}
```

`<fieldset>` and `<legend>` are used to group related radio buttons and checkboxes.

For example, a yes/no question can be grouped under one legend.

The default browser fieldset border is removed so the form still matches the design.

This improves accessibility because screen readers can announce the question and the available options as one group.

---

## Part 20 — Buttons

```css
button {
  padding: 12px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: var(--uni-yellow);
  color: var(--uni-black);
  min-height: 44px;
  touch-action: manipulation;
}

button:hover {
  opacity: .88;
}

button:active {
  opacity: .75;
}

button:focus-visible {
  outline: 2px solid var(--uni-black);
  outline-offset: 2px;
}

button[disabled] {
  opacity: .45;
  cursor: not-allowed;
}

.btn-ghost {
  background: var(--pill-bg);
  color: var(--uni-black);
  font-weight: 400;
}
```

Buttons use the University of Graz yellow as the primary action colour.

`min-height: 44px` supports touch use.

`:hover` and `:active` give visual feedback.

`:focus-visible` shows a keyboard focus outline when a button is reached by keyboard.

`button[disabled]` makes disabled buttons appear faded.

`.btn-ghost` is used for secondary actions such as Back, Stop, or Microphone setup.

---

## Part 21 — Pills

```css
.pill {
  display: inline-block;
  background: var(--pill-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--muted);
}
```

Pills are small rounded labels.

They are used for status information such as microphone status, item progress, or task state.

`border-radius: 999px` creates the fully rounded pill shape.

---

## Part 22 — Divider

```css
.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 20px 0;
}
```

The `.divider` class creates a horizontal line.

It is used to visually separate parts of a screen, for example between form content and navigation buttons.

---

## Part 23 — Hidden utility

```css
.hidden {
  display: none !important;
}
```

The `.hidden` class hides optional content.

JavaScript adds and removes this class for conditional questionnaire sections.

For example, if a participant answers “yes” to a question, a follow-up field can be shown. If they answer “no”, the follow-up field stays hidden.

---

## Part 24 — Group selection cards

```html
<section id="scr-group" class="screen active">
  <h2>Welcome / Willkommen</h2>

  <div class="group-grid">
    <div
      class="group-card"
      id="btnGroupEN"
      role="button"
      tabindex="0"
      aria-label="Native English speaker"
    >
      <div class="flag">🇬🇧</div>
      <div class="grp-label">Native English speaker</div>
      <div class="grp-sub">English is my first language</div>
    </div>

    <div
      class="group-card"
      id="btnGroupDE"
      role="button"
      tabindex="0"
      aria-label="Muttersprachler Deutsch"
    >
      <div class="flag">🇦🇹</div>
      <div class="grp-label">Muttersprachler Deutsch</div>
      <div class="grp-sub">Meine Muttersprache ist Deutsch</div>
    </div>
  </div>
</section>
```

The first screen asks participants to choose their group.

The cards are visually styled as large selection buttons.

`role="button"` tells assistive technologies that the card behaves like a button.

`tabindex="0"` makes the card reachable with the keyboard.

`aria-label` gives each card a clear accessible name.

---

## Part 25 — Group selection CSS

```css
.group-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.group-card {
  border: 2px solid var(--border);
  border-radius: 14px;
  padding: 24px 20px;
  cursor: pointer;
  text-align: center;
  transition: border-color .15s;
  background: var(--white);
  outline-offset: 3px;
}

.group-card:hover {
  border-color: var(--uni-yellow);
}

.group-card:focus {
  outline: 2px solid var(--uni-yellow);
  border-color: var(--uni-yellow);
}

.group-card .flag {
  font-size: 38px;
  margin-bottom: 10px;
  line-height: 1;
}

.group-card .grp-label {
  font-weight: 700;
  font-size: 16px;
  color: var(--uni-black);
}

.group-card .grp-sub {
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
}
```

The group cards use CSS Grid for the layout and card styling for the clickable options.

The hover and focus rules show yellow outlines or borders when a card is active.

This makes the interaction visible for both mouse users and keyboard users.

---

## Part 26 — Group selection responsiveness

```css
@media (max-width: 520px) {
  .group-grid {
    grid-template-columns: 1fr;
  }
}
```

On small screens, the two group cards stack vertically.

This avoids squeezing both cards into a narrow row.

---

## Part 27 — Consent scroll box

```html
<section id="scr-consent" class="screen">
  <h2>Participant Information & Consent</h2>

  <div class="consent-box" tabindex="0">
    ...
  </div>

  <div class="scroll-hint">
    <span class="scroll-dot"></span>
    Scroll inside the box to read all information ↓
  </div>
</section>
```

The consent text is displayed in a scrollable box.

The box keeps long information text manageable while still allowing participants to read the full content.

`tabindex="0"` allows keyboard users to focus the scroll box and scroll inside it.

---

## Part 28 — Consent scroll box CSS

```css
.consent-box {
  max-height: 300px;
  overflow-y: scroll;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--pill-bg);
  font-size: 15px;
  line-height: 1.5;
  scrollbar-width: auto;
  scrollbar-color: rgba(0,0,0,.3) rgba(0,0,0,.06);
}

.consent-box::-webkit-scrollbar {
  width: 10px;
}

.consent-box::-webkit-scrollbar-track {
  background: rgba(0,0,0,.05);
  border-radius: 999px;
}

.consent-box::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,.25);
  border-radius: 999px;
}
```

`max-height: 300px` limits the height of the consent box.

`overflow-y: scroll` makes the box scroll vertically.

The scrollbar styling makes the scroll area more visible.

The `::-webkit-scrollbar` rules apply to Chromium-based browsers and Safari. `scrollbar-width` and `scrollbar-color` apply to Firefox.

---

## Part 29 — Scroll hint

```css
.scroll-hint {
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.scroll-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--uni-yellow);
  border: 1px solid var(--border);
  flex-shrink: 0;
}
```

The scroll hint reminds participants that the consent information is inside a scrollable box.

The yellow dot provides a small visual accent without making the hint too prominent.

---

## Part 30 — Consent checkbox

```html
<div class="consent-check">
  <input type="checkbox" id="consentChk">
  <label for="consentChk">
    I have read the information above and I consent to participate in this study.
  </label>
</div>
```

The checkbox is connected to its label with `for="consentChk"` and `id="consentChk"`.

This improves usability because clicking the label also toggles the checkbox.

It also helps screen readers identify the checkbox correctly.

```css
.consent-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0;
}

.consent-check label {
  font-size: 15px;
  color: var(--uni-black);
  line-height: 1.4;
  font-weight: 400;
  margin: 0;
}
```

The checkbox and label are displayed side by side.

`align-items: flex-start` keeps the checkbox aligned with the first line of the label.

---

## Part 31 — Participant details grid

```css
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
  margin-top: 10px;
}

@media (max-width: 520px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}
```

Participant details are arranged in two columns on wider screens.

On smaller screens, the fields collapse into one column.

This makes the form readable and usable on both desktop and mobile screens.

---

## Part 32 — Questionnaire cards

```css
.q-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  margin-top: 12px;
}
```

Questionnaire sections are shown as smaller cards.

This visually separates groups of related questions and makes the questionnaire easier to scan.

---

## Part 33 — Step badges

```css
.step-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.step-badge {
  display: inline-block;
  background: var(--pill-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--muted);
}
```

Step badges show the participant where they are in the multi-step questionnaire.

`flex-wrap: wrap` prevents badges from overflowing on smaller screens.

---

## Part 34 — Inline choices

```css
.choice-inline {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8px;
}

.choice-inline label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  font-weight: 400;
  margin: 4px 0;
  cursor: pointer;
}
```

`.choice-inline` is used for radio button groups such as Yes/No questions.

The labels are displayed as flex rows so the radio button and text sit neatly next to each other.

`cursor: pointer` makes it clear that the label can be clicked.

---

## Part 35 — Checkbox groups

```css
.checkbox-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.checkbox-group label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  font-weight: 400;
  margin: 4px 0;
  cursor: pointer;
}

@media (max-width: 600px) {
  .checkbox-group {
    grid-template-columns: 1fr;
  }
}
```

Checkbox groups can contain several options, such as language categories or perceived change categories.

On wide screens, the options are arranged in three columns.

On small screens, they collapse into one column.

---

## Part 36 — Task selection cards

```html
<section id="scr-taskselect" class="screen">
  <h2>Choose a task</h2>
  <p>You must complete both tasks. You may do them in any order.</p>

  <div id="taskGrid" class="task-grid"></div>
</section>
```

The task selection screen contains an empty `#taskGrid`.

The task cards are created by JavaScript from the task data in `data/tasks.json`.

This means the HTML does not manually list the task cards. The page structure provides a container, and JavaScript fills it with the available tasks.

---

## Part 37 — Task card CSS

```css
.task-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.task-card {
  border: 2px solid var(--border);
  border-radius: 14px;
  padding: 28px 20px;
  background: var(--white);
  cursor: pointer;
  text-align: center;
  transition: border-color .15s, background .15s;
  outline-offset: 3px;
}

.task-card:hover {
  border-color: var(--uni-yellow);
}

.task-card:focus {
  outline: 2px solid var(--uni-yellow);
  border-color: var(--uni-yellow);
}

.task-card .task-flag {
  font-size: 38px;
  margin-bottom: 10px;
  line-height: 1;
}

.task-card .task-name {
  font-weight: 700;
  font-size: 16px;
  color: var(--uni-black);
}

.task-card.done {
  background: var(--pill-bg);
  border-color: var(--border);
  cursor: default;
  opacity: 0.45;
  pointer-events: none;
}
```

Task cards behave similarly to the group selection cards.

The `.done` class is added by JavaScript when a task has already been completed.

`pointer-events: none` prevents completed cards from being clicked again.

---

## Part 38 — Task grid responsiveness

```css
@media (max-width: 560px) {
  .task-grid {
    grid-template-columns: 1fr;
  }
}
```

On smaller screens, task cards stack vertically.

This keeps the card text readable and prevents the layout from becoming cramped.

---

## Part 39 — Microphone setup

```css
.mic-row {
  margin-top: 10px;
}

.mic-row .row {
  margin-top: 6px;
}

.mic-row select {
  flex: 1;
}

.test-box {
  margin-top: 16px;
  background: var(--pill-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}

.test-prompt {
  font-size: 17px;
  font-weight: 600;
  margin: 10px 0;
  color: var(--uni-black);
}
```

The microphone setup screen includes a device picker and a test recording section.

`.test-box` visually separates the test recording from the rest of the microphone setup.

The test prompt is slightly larger and bold because participants need to read it aloud.

---

## Part 40 — Recording prompt

```css
.prompt-display {
  font-size: 38px;
  text-align: center;
  line-height: 1.2;
  margin: 20px 0 12px;
  word-break: break-word;
  color: var(--uni-black);
}

@media (max-width: 520px) {
  .prompt-display {
    font-size: 28px;
  }
}
```

The recording prompt is the sentence participants read aloud.

It is large and centred because it needs to be readable while speaking.

On smaller screens, the font size is reduced from 38px to 28px so the sentence still fits comfortably.

`word-break: break-word` prevents very long words from overflowing the card.

---

## Part 41 — Prime word box

```css
.prime-box {
  background: var(--pill-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  margin: 12px 0;
}

.prime-label {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
}

.prime-words {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.prime-word {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 16px;
  font-weight: 700;
  font-size: 16px;
}
```

The prime words are displayed above the carrier sentence.

Each prime word is styled as a rounded pill.

`flex-wrap: wrap` allows the prime words to move onto another line if there is not enough space.

---

## Part 42 — Upload overlay

```html
<div id="overlay" class="overlay" aria-hidden="true">
  <div class="overlay-box">
    <div class="spinner" aria-hidden="true"></div>
    <div>
      <strong id="overlayTitle">Uploading… please wait</strong>
      <p id="overlayMsg">Do not close this tab.</p>
    </div>
  </div>
</div>
```

The upload overlay appears while files are being saved.

It prevents participants from clicking other controls during upload.

```css
.overlay {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.82);
  z-index: 9999;
}

.overlay.active {
  display: flex;
}

.overlay-box {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 400px;
  width: 90vw;
}
```

`position: fixed` makes the overlay cover the viewport.

`inset: 0` is shorthand for top, right, bottom, and left all being set to 0.

`.overlay.active` is shown with `display: flex`.

The overlay box is centred on the page.

---

## Part 43 — Spinner animation

```css
.spinner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--uni-black);
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

The spinner is a small circular loading indicator.

It uses a full grey border and a black top border.

The `spin` animation rotates it continuously.

`linear` means the speed stays constant.

`infinite` means the animation repeats until the overlay is hidden.

---

## Part 44 — Done state

```css
.alldone-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 0;
  gap: 10px;
}

.alldone-emoji {
  font-size: 52px;
  line-height: 1;
  margin-bottom: 4px;
}

.alldone-title {
  font-size: 26px;
  font-weight: 700;
}

.alldone-sub {
  font-size: 16px;
  color: var(--muted);
}
```

The all-done state is shown when both tasks are completed.

It uses centred text and a large emoji to give participants clear feedback that the session is finished.

---

## Part 45 — Confetti animation

```css
.confetti-piece {
  position: fixed;
  top: -40px;
  pointer-events: none;
  z-index: 9999;
  animation: confettiFall linear forwards;
  user-select: none;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }

  80% {
    opacity: 1;
  }

  100% {
    transform: translateY(110vh) rotate(540deg);
    opacity: 0;
  }
}
```

JavaScript creates individual confetti elements when both tasks are completed.

The CSS controls how those elements fall.

`position: fixed` places each confetti piece relative to the viewport.

`pointer-events: none` makes sure confetti does not block buttons or links.

The animation moves each piece down the screen, rotates it, and fades it out.

---

## Part 46 — Audio element

```css
audio {
  width: 100%;
}
```

The test recording can be played back through an audio element.

Setting `width: 100%` makes the audio control fit neatly inside the card.

---

## Part 47 — Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .confetti-piece {
    animation: none;
  }

  .spinner {
    animation: none;
    border-top-color: var(--uni-black);
  }

  .group-card {
    transition: none;
  }
}
```

This media query respects the user’s reduced-motion preference.

If the user has requested reduced motion in their operating system or browser, decorative animations are disabled.

The confetti animation stops.

The spinner animation stops.

Group card transitions are removed.

This supports accessibility because some users find motion distracting or uncomfortable.

---

## Part 48 — How HTML and CSS work together

The HTML defines what exists on the page.

For example:

```html
<button id="btnStartRec">Start recording</button>
```

The CSS defines how it looks:

```css
button {
  background: var(--uni-yellow);
  border-radius: var(--radius-input);
  min-height: 44px;
}
```

JavaScript defines what it does:

```js
btnStartRec.addEventListener("click", startRecording);
```

The three layers work together:

* HTML gives the page structure.
* CSS gives the page layout and visual design.
* JavaScript gives the page behaviour.

---

## Part 49 — Why the final structure is useful

The final project separates the main concerns into different files:

```text
index.html       structure
css/styles.css   design and responsive layout
js/app.js        behaviour and recording logic
data/tasks.json  task and stimulus data
imprint.html     legal/imprint page
```

This is easier to maintain than a single large HTML file.

The HTML can be checked with the Nu HTML Checker.

The CSS can be inspected separately.

The JavaScript can be extended without rewriting the page structure.

The data can be changed without editing the main app code.

This structure is also clearer for a final university submission because it shows how the project moved from a prototype into a deployable website.
