# HTML & CSS Tutorial — Speech Recording Tool


## Part 1 — The document shell

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Speech Recording Tool</title>
```

**`<!doctype html>`**
This must be the very first line of every HTML file. It tells the browser "this is a modern HTML5 document". Without it, browsers enter a mode called "quirks mode" where they render things inconsistently across different browsers.

**`<html lang="en">`**
The root element that wraps the entire page. The `lang="en"` attribute tells the browser and screen readers what language the page is in — this matters for accessibility and browser spellcheck. The default is set to `"en"` (English) because Screen 0, the first thing participants see, is displayed in English for both groups. Once the participant selects their group, JavaScript updates this attribute automatically: if they pick the German group, JavaScript runs `document.documentElement.lang = "de"`, switching the declared language to German for the rest of the session.

**`<meta charset="utf-8">`**
Sets the character encoding. UTF-8 supports all characters including German umlauts (ä, ö, ü, ß) and flag emojis (🇦🇹 🇬🇧). Without this, special characters can show up as garbled symbols.

**`<meta name="viewport" content="width=device-width, initial-scale=1">`**
This is what makes the page not look tiny on mobile screens. `width=device-width` tells the browser to use the actual screen width instead of pretending it's a desktop. `initial-scale=1` means don't zoom in or out by default.

**`<title>Speech Recording Tool</title>`**
Sets the text shown in the browser tab. Not visible on the page itself.

---

## Part 2 — CSS custom properties (colour tokens)

```css
:root {
  --uni-yellow: #ffd500;
  --uni-black:  #000000;
  --white:      #ffffff;
  --muted:      #444444;
  --border:     #e6e6e6;
  --pill-bg:    #f7f7f7;
  --shadow:     0 10px 30px rgba(0,0,0,.08);
}
```

CSS custom properties (also called CSS variables) let you define a value once and reuse it everywhere. They always start with `--` and are defined inside `:root`, which targets the `<html>` element — the highest level of the page, so the variables are available everywhere.

You reference them with `var(--name)`. For example `background: var(--uni-yellow)` uses the yellow colour defined above.

**Why this matters:** If you want to change the yellow to a different colour, you change it in one place here and every button, dot, and highlight updates automatically. Without variables you would have to find and change every single occurrence of `#ffd500` throughout the file.

**`rgba(0,0,0,.08)`** is a colour in Red/Green/Blue/Alpha format. The `.08` at the end is opacity — 8% opaque black, which creates a very soft shadow.

---

## Part 3 — Reset and base styles

```css
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--white);
  color: var(--uni-black);
  font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial;
  font-size: 16px;
  line-height: 1.5;
}
```

**`*, *::before, *::after { box-sizing: border-box; }`**
The `*` selector targets every single element on the page. `box-sizing: border-box` changes how width is calculated: by default, `width: 100%` means the content is 100% wide and padding is added on top, which can cause elements to overflow their container. With `border-box`, padding is included inside the width — so `width: 100%` always means exactly 100% of the container. `::before` and `::after` are pseudo-elements (decorative content added via CSS) — they get the same rule.

**`margin: 0; padding: 0`** on `html, body`: Browsers add their own default margins to the `<body>` element. This removes them so the page starts flush at the edges.

**`font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial`** is a font stack. The browser tries each font left to right and uses the first one it finds installed. Inter is a modern clean font; the rest are system fallbacks that look good on Windows, Mac, and Linux.

**`line-height: 1.5`** sets the spacing between lines of text to 1.5 times the font size — more readable than the default.

---

## Part 4 — Layout: wrap and card

```css
.wrap {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px;
}
.card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow);
  padding: 28px;
}
```

**`.wrap`** is the outer container. `max-width: 920px` means the content never gets wider than 920px even on large monitors. `margin: 0 auto` is the classic CSS centering trick — `0` for top/bottom margin, `auto` for left/right, which splits the remaining space equally on both sides. `padding: 24px` adds breathing room between the content and the screen edges.

**`.card`** is the white box that contains everything.
- `border: 1px solid var(--border)` — a thin light grey border. `1px solid` is the most common border shorthand: thickness, style, colour.
- `border-radius: 16px` — rounds all four corners by 16 pixels.
- `box-shadow: var(--shadow)` — the shadow value is `0 10px 30px rgba(0,0,0,.08)`. The four values are: horizontal offset (0 = centred), vertical offset (10px downward), blur radius (30px = soft), colour (8% black = very subtle).
- `padding: 28px` — space inside the card between the border and the content.

---

## Part 5 — The shared header

```html
<div class="site-header">
  <h1>Speech Recording</h1>
  <img class="uni-logo"
       src="img/logo_uni_graz_4c.jpg"
       alt="University of Graz" />
</div>
```

```css
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.site-header h1 { margin: 0; font-size: 22px; }
.uni-logo { height: 40px; width: auto; border-radius: 6px; }
```

The header is visible on every screen — it contains the site title and the University of Graz logo.

**`display: flex`** activates Flexbox layout. Flex makes the direct children (here: `<h1>` and `<img>`) sit side by side in a row automatically.

**`justify-content: space-between`** pushes the first child to the left and the last child to the right, with all available space between them. This is how the title ends up on the left and the logo on the right.

**`align-items: center`** vertically centres both children within the header.

**`border-bottom: 1px solid var(--border)`** draws a thin line under the header to visually separate it from the screen content below.

**`<img src="img/logo_uni_graz_4c.jpg" alt="University of Graz">`** loads the logo from the local `img/` folder. The `alt` attribute provides a text description for screen readers and also shows as text if the image fails to load. `width: auto` on the image means the width adjusts automatically to maintain the correct proportions when only the height is fixed.

---

## Part 6 — The screen system

```css
.screen        { display: none; }
.screen.active { display: block; }
```

```html
<div id="scr-group" class="screen active"> ... </div>
<div id="scr-consent" class="screen"> ... </div>
<div id="scr-details" class="screen"> ... </div>
<!-- etc. -->
```

All 9 screens of the app are present in the HTML at the same time, but only one is visible at once. By default every `.screen` has `display: none` — it is completely removed from the layout and takes up no space (different from `visibility: hidden` which hides the element but keeps its space).

When JavaScript adds the class `active` to a screen, the rule `.screen.active { display: block; }` overrides the default and makes it visible. When you navigate to a new screen, JavaScript removes `active` from the current screen and adds it to the next one. This is how the whole single-page app works — no page reloads, just CSS class toggling.

**`.screen.active`** is a compound selector — it targets elements that have both the class `screen` AND the class `active` at the same time.

---

## Part 7 — Typography

```css
h2 { margin: 0 0 6px; font-size: 20px; }
h3 { margin: 0 0 6px; font-size: 17px; }
p  { margin: 0 0 10px; color: var(--muted); }
ul { margin: 6px 0 10px 20px; color: var(--muted); }
li { margin: 4px 0; }
.muted { color: var(--muted); font-size: 13px; }
```

**`margin: 0 0 6px`** is shorthand for top/right/bottom/left margins. When three values are given: first = top, second = left and right, third = bottom. So this means: 0 top, 0 left/right, 6px bottom. The bottom margin creates spacing below each heading.

**`color: var(--muted)`** sets paragraph and list text to `#444444` — dark grey rather than pure black. Pure black on white can feel harsh; slightly softened text is easier to read.

**`.muted`** is a utility class used on small helper text like footnotes and placeholder labels.

---

## Part 8 — The row layout

```css
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
```

`.row` is used whenever buttons, pills, or inputs need to sit side by side — for example the "Agree and continue" and "Decline" buttons on the consent screen.

- `display: flex` — arranges children in a row
- `flex-wrap: wrap` — if items don't fit on one line, they wrap to a new line instead of overflowing
- `gap: 10px` — spacing between items (works like margin but only between items, not on the outside)
- `align-items: center` — vertically centres all items

---

## Part 9 — Form elements: inputs and selects

```css
input, select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 15px;
  background: var(--white);
  color: var(--uni-black);
}
input:focus, select:focus {
  outline: 2px solid var(--uni-yellow);
  outline-offset: 1px;
}
input[type="checkbox"] { width: auto; margin: 0; }
```

**`width: 100%`** makes every input stretch to fill its container.

**`font-family: inherit`** and **`font-size: inherit`** on selects: browsers apply their own fonts to `<select>` elements by default. `inherit` forces them to use the same font as the rest of the page.

**`input:focus, select:focus`** — `:focus` is a pseudo-class that applies when the user has clicked on or tabbed into an element. Here it adds a 2px yellow outline, which signals to the user which field is currently active. `outline-offset: 1px` adds a tiny gap between the element border and the focus ring.

**`input[type="checkbox"] { width: auto; }`** — the `[type="checkbox"]` attribute selector targets only checkboxes. The general `input` rule above sets `width: 100%` which would make a checkbox stretch across the full width — wrong. `width: auto` overrides this for checkboxes specifically. The `!important` is not needed here since the attribute selector is more specific.

---

## Part 10 — Buttons

```css
button {
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: var(--uni-yellow);
  color: var(--uni-black);
}
button:hover   { opacity: .88; }
button:active  { opacity: .75; }
button[disabled] { opacity: .45; cursor: not-allowed; }
.btn-ghost {
  background: var(--pill-bg);
  color: var(--uni-black);
  font-weight: 400;
}
```

The default `button` style is yellow — the primary action. Every button on the page gets this style automatically.

**`cursor: pointer`** changes the mouse cursor to a hand on hover, signalling it is clickable.

**`:hover`** applies when the mouse is over the button. `opacity: .88` makes it slightly transparent — a subtle visual response.

**`:active`** applies while the button is being clicked. `opacity: .75` makes it more transparent, giving a "press" feel.

**`button[disabled]`** applies when the button has the HTML `disabled` attribute. `opacity: .45` makes it look faded. `cursor: not-allowed` shows the ⛔ cursor.

**`.btn-ghost`** is a modifier class added alongside `button` for secondary actions like "Back" or "Stop". It overrides the yellow background to grey, making it look less prominent than the primary button.

---

## Part 11 — Pills

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

Pills are the small status labels like "Item 3 / 22" or "Microphone: not started" on the recording screen.

**`display: inline-block`** makes the element flow with text (like a word) but also allows padding and a fixed size (like a block). Needed here so the pill doesn't stretch full-width.

**`border-radius: 999px`** — a very large border-radius value that guarantees fully rounded ends regardless of the element's height. Any value larger than half the element's height produces the same pill shape.

---

## Part 12 — Screen 0: group selection cards

```html
<div class="group-grid">
  <div class="group-card" id="btnGroupDE">
    <div class="flag">🇦🇹</div>
    <div class="grp-label">Native Austrian German speaker</div>
    <div class="grp-sub">Meine Muttersprache ist Deutsch</div>
  </div>
  <div class="group-card" id="btnGroupEN">
    ...
  </div>
</div>
```

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
}
.group-card:hover { border-color: var(--uni-yellow); }
@media (max-width: 520px) { .group-grid { grid-template-columns: 1fr; } }
```

**`display: grid`** activates CSS Grid — a layout system for two-dimensional arrangements.

**`grid-template-columns: 1fr 1fr`** creates two equal columns. `1fr` means "1 fraction of the available space". Two `1fr` columns each get 50% of the width.

**`transition: border-color .15s`** animates the border colour change smoothly over 0.15 seconds when the user hovers. Without this, the border would snap instantly from grey to yellow.

**`@media (max-width: 520px)`** is a media query — CSS that only applies when the screen is 520px wide or narrower. On small screens the two-column grid becomes one column so the cards stack vertically instead of being squashed side by side.

---

## Part 13 — Screen 1: consent scroll box

```css
.consent-box {
  max-height: 300px;
  overflow-y: scroll;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--pill-bg);
  scrollbar-width: auto;
  scrollbar-color: rgba(0,0,0,.3) rgba(0,0,0,.06);
}
.consent-box::-webkit-scrollbar       { width: 10px; }
.consent-box::-webkit-scrollbar-track { background: rgba(0,0,0,.05); border-radius: 999px; }
.consent-box::-webkit-scrollbar-thumb { background: rgba(0,0,0,.25); border-radius: 999px; }
```

**`max-height: 300px`** — the box grows up to 300px tall, then stops growing. Content beyond that is hidden.

**`overflow-y: scroll`** — always shows a vertical scrollbar (even if the content fits). This makes it obvious to participants that there is more to read below.

**`scrollbar-width: auto` and `scrollbar-color`** — Firefox-specific scrollbar styling. Two colours: the thumb (the draggable part) and the track (the background).

**`::-webkit-scrollbar`** rules — Chrome, Edge, and Safari use a different system for custom scrollbars. `::` introduces a pseudo-element — a specific part of an element you can style separately. These three rules style the scrollbar width, track background, and thumb colour for Chromium-based browsers.

---

## Part 14 — Screen 1: consent checkbox

```html
<div class="consent-check">
  <input type="checkbox" id="consentChk" />
  <span>I have read the information above and I consent to participate.</span>
</div>
```

```css
.consent-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0;
}
```

The checkbox and its label text are wrapped in a flex container so they sit side by side. `align-items: flex-start` aligns them to the top rather than the centre — important if the label text wraps to multiple lines, so the checkbox stays at the top rather than floating in the middle.

The `id="consentChk"` on the input is referenced by JavaScript to check whether it has been ticked before allowing the user to continue.

---

## Part 15 — Screen 2: participant details grid

```css
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}
.details-grid .full { grid-column: 1 / -1; }
@media (max-width: 520px) { .details-grid { grid-template-columns: 1fr; } }
```

The participant details form uses a two-column grid so fields like year of birth and sex sit side by side.

**`gap: 0 20px`** — two values for gap: first = row gap (0, no vertical gap between rows), second = column gap (20px between columns).

**`.details-grid .full`** — a descendant selector targeting elements with class `full` that are inside `.details-grid`. `grid-column: 1 / -1` makes that element span from the first column to the last (−1 means "the end"). This is used for the Participant ID field so it takes up the full width rather than just half.

---

## Part 16 — Screen 4: task cards

```html
<div class="task-grid">
  <div class="task-card">
    <h3>Task A — English reading</h3>
    <p>Read short English sentences aloud and record each one.</p>
    <button id="btnPickA">Start Task A</button>
  </div>
  <div class="task-card"> ... </div>
</div>
```

```css
.task-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
.task-card { border: 1px solid var(--border); border-radius: 14px; padding: 20px; background: var(--pill-bg); }
.done-badge {
  display: inline-block;
  background: var(--uni-yellow);
  font-size: 12px; font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}
```

Same two-column grid as the group selection. Each task is a card with a light grey background (`var(--pill-bg)`).

**`.done-badge`** is a yellow pill that JavaScript will add to a task card once that task is completed. It's defined in the CSS now even though it won't appear until the JavaScript adds it — CSS rules don't cause anything to appear on their own, they just describe how an element looks if it exists.

---

## Part 17 — Screen 7: the recording prompt

```css
.prompt-display {
  font-size: 38px;
  text-align: center;
  line-height: 1.2;
  margin: 20px 0 12px;
  word-break: break-word;
}
```

This is the large centred text showing the sentence the participant needs to read aloud.

**`font-size: 38px`** — much larger than normal body text so the participant can read it at a glance while speaking without leaning in.

**`line-height: 1.2`** — tighter line spacing than body text (which uses 1.5). Longer sentences that wrap to two lines don't take up too much vertical space.

**`word-break: break-word`** — if a single word is too long to fit on one line (unlikely for normal sentences but important for safety), it breaks mid-word rather than overflowing out of the container.

---

## Part 18 — The upload overlay

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
.overlay.active { display: flex; }
.spinner {
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--uni-black);
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

The overlay appears while a recording is uploading to prevent the participant from clicking anything.

**`position: fixed`** — positions the element relative to the browser viewport, not the page. It stays in place even if the user scrolls.

**`inset: 0`** — shorthand for `top: 0; right: 0; bottom: 0; left: 0`. Makes the overlay cover the entire screen.

**`display: flex` with `align-items: center; justify-content: center`** — centres the spinner box both horizontally and vertically in the screen.

**`background: rgba(255,255,255,.82)`** — 82% opaque white, so the page content is visible but dimmed underneath.

**`z-index: 9999`** — controls stacking order. Elements with higher z-index appear in front. 9999 ensures the overlay is always on top of everything else.

The spinner is a CSS animation. **`border-radius: 50%`** makes the square div into a circle. The element has a full grey border but one side (`border-top-color`) is set to black — creating the arc effect. **`@keyframes spin`** defines the animation: rotate from 0 to 360 degrees. **`animation: spin 1s linear infinite`** applies it — run the `spin` animation over 1 second, at constant speed, looping forever.

---

## Part 19 — The footer

```html
<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);text-align:center">
  <a href="imprint.html" style="font-size:12px;color:var(--muted);text-decoration:none">Impressum / Imprint</a>
</div>
```

A simple footer at the bottom of the card with a link to the imprint page. The styles here are written inline (directly in the `style` attribute) rather than in the `<style>` block — this is fine for one-off styles that apply to a single element and won't be reused anywhere else.

**`text-decoration: none`** removes the default blue underline from the link.

**`<a href="imprint.html">`** is an anchor element — the standard HTML element for links. `href` is the destination. Since `imprint.html` is in the same folder as `index.html`, no path prefix is needed.

