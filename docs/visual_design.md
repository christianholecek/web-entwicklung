# visual-design.md

## Design Goals

The interface is designed to guide non-technical research participants through the recording process as clearly and effortlessly as possible. Every screen has a single focus — one decision or one action at a time. University of Graz branding (yellow accent, black text, white background) is used throughout to signal institutional trust. Clarity and simplicity take priority over visual complexity.

---

## Branding

- **Institution:** Universität Graz
- **Logo:** Stored locally in `img/logo_uni_graz_4c.jpg` — displayed top right on every screen
- **Primary accent:** `#ffd500` (Uni Graz yellow)
- **Primary text:** `#000000` (black)
- **Background:** `#ffffff` (white)

---

## Colour Palette

| Variable | Value | Usage |
|---|---|---|
| `--uni-yellow` | `#ffd500` | Primary buttons, hover highlights, scroll dot |
| `--uni-black` | `#000000` | Headings, body text, button text |
| `--white` | `#ffffff` | Page and card background |
| `--muted` | `#444444` | Subtitle text, hints, footnotes |
| `--border` | `#e6e6e6` | Card borders, input borders, dividers |
| `--pill-bg` | `#f7f7f7` | Pills, ghost buttons, card backgrounds, consent box |
| `--shadow` | `0 10px 30px rgba(0,0,0,.08)` | Card drop shadow |

All colours are defined as CSS custom properties in `:root` for easy global changes.

---

## Layout

- **Max width:** 920px, centred with `margin: 0 auto`
- **Outer padding:** 24px
- **Single card:** All content lives inside one `.card` div with 16px border radius, light border, and soft shadow
- **Single page:** All screens are `<div class="screen">` elements — only the active one has `display: block`; the rest are hidden with `display: none`
- **Shared header:** Logo and title visible on every screen, separated from content by a bottom border

---

## Typography

- **Font stack:** `Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial`
- **h1:** 22px (site title in header)
- **h2:** 20px (screen titles)
- **h3:** 17px (card titles)
- **Body:** 16px, line-height 1.5
- **Prompt text** (sentence to read aloud): 38px, centred — large enough to read at a glance while speaking
- **Footnotes:** 12px, muted colour

---

## Components

### Buttons
- **Primary:** Yellow background, black bold text, 10px border radius
- **Ghost:** Light grey background (`--pill-bg`), normal weight — used for secondary actions (Back, Stop, etc.)
- **Disabled:** `opacity: 0.45`, `cursor: not-allowed`

### Pills / Status badges
- Rounded (border-radius 999px), light background, 13px text
- Used for status indicators (e.g. "Item 3 / 22", "Microphone: not started")

### Group selection cards (Screen 0)
- Two-column grid, large flag emoji, label, and subtitle
- Border highlights yellow on hover

### Task selection cards (Screen 4)
- Two-column grid on desktop, single column on mobile (breakpoint: 560px)
- Completed tasks will show a yellow done badge

### Consent scroll box (Screen 1)
- Fixed max-height (300px) with always-visible scrollbar
- Scroll hint indicator with yellow dot below the box
- Custom scrollbar styling for WebKit browsers

### Participant details grid (Screen 2)
- Two-column grid for form fields
- Participant ID spans full width
- Collapses to single column below 520px

### Recording prompt (Screen 7)
- 38px centred text — designed for readability while speaking
- Prime words displayed as rounded pills above the sentence

### Upload overlay
- Full-screen semi-transparent white backdrop
- Centred spinner + message — prevents interaction during upload

---

## Screen Navigation Flow

```
Screen 0: Group selection
  → Screen 1: Consent
    → Screen 2: Participant details
      → Screen 3: Questionnaire
        → Screen 4: Task selection
          → Screen 5: Task instructions
            → Screen 6: Mic setup
              → Screen 7: Recording
                → Screen 8: Done → back to Screen 4
```

---

## Responsive Behaviour

- Group grid, task grid: 2 columns → 1 column below 520–560px
- Details grid: 2 columns → 1 column below 520px
- Mobile testing and refinements planned for a later milestone

---

## Design Decisions

| Decision | Reason |
|---|---|
| All CSS embedded in `index.html` | Keeps the tool as a single self-contained file |
| CSS custom properties for colours | Easy to update globally; consistent across all components |
| 38px prompt font size | Participants must read at a glance while speaking — legibility is critical |
| No dark mode | Simplicity; not needed for a controlled research setting |
| Logo stored locally in `img/` | Avoids dependency on university server; works offline and on GitHub Pages |
| Disabled buttons until conditions met | Prevents user errors (e.g. skipping consent, starting without mic test) |
