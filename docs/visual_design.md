# Visual design documentation

## Design goals

The interface is designed to guide non-technical research participants through a speech recording task as clearly and calmly as possible. Each screen focuses on one decision or one action at a time. This reduces cognitive load and helps participants understand what they need to do next.

The visual design uses University of Graz branding to signal that the tool belongs to an institutional research context. Clarity and usability are more important than visual complexity.

---

## Branding

* **Institution:** Universität Graz
* **Logo:** stored locally in `img/logo_uni_graz_4c.jpg`
* **Primary accent colour:** `#ffd500`, based on University of Graz yellow
* **Primary text colour:** black
* **Main background:** white

The logo is loaded locally so that the website works reliably on GitHub Pages and does not depend on an external university server.

---

## Colour palette

| Variable       | Value                         | Usage                                               |
| -------------- | ----------------------------- | --------------------------------------------------- |
| `--uni-yellow` | `#ffd500`                     | Primary buttons, hover highlights, accent elements  |
| `--uni-black`  | `#000000`                     | Headings, body text, button text                    |
| `--white`      | `#ffffff`                     | Page and card background                            |
| `--muted`      | `#444444`                     | Subtitle text, hints, supporting text               |
| `--border`     | `#e6e6e6`                     | Card borders, input borders, dividers               |
| `--pill-bg`    | `#f7f7f7`                     | Pills, ghost buttons, card backgrounds, consent box |
| `--shadow`     | `0 10px 30px rgba(0,0,0,.08)` | Card drop shadow                                    |

The palette is deliberately simple. Black text on white or pale grey backgrounds supports readability, while yellow is used as an institutional accent and for important action buttons.

---

## Layout

The project uses a centred single-card layout.

* **Maximum width:** approximately 920px
* **Outer spacing:** generous desktop padding with reduced spacing on smaller screens
* **Main card:** rounded corners, light border, and subtle shadow
* **Single-page flow:** screens are shown and hidden dynamically
* **Shared header:** the site title and University of Graz logo remain visually consistent across screens

The single-card layout was chosen because the application is a guided task rather than a content-heavy website. Keeping all actions inside the same visual frame helps participants understand that they are moving through one coherent process.

---

## File structure and styling

The final version separates structure, styling, functionality, and task data.

| File or folder   | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `index.html`     | Main semantic HTML structure              |
| `css/styles.css` | Visual styling and responsive rules       |
| `js/app.js`      | JavaScript functionality and screen logic |
| `data/`          | JSON task and stimulus data               |
| `img/`           | Local image assets                        |
| `imprint.html`   | Imprint page                              |

The CSS is stored in `css/styles.css`, not embedded in the HTML. This keeps the HTML cleaner and makes the design easier to maintain.

---

## Typography

The font stack uses system fonts for reliability and fast loading.

* **Font stack:** `Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial`
* **Main title:** compact and prominent in the shared header
* **Screen headings:** clear and descriptive
* **Body text:** readable size and line height
* **Recording prompt:** large, centred, and easy to read aloud
* **Footnotes and hints:** smaller and visually muted

The recording prompt is intentionally large because participants need to read it quickly while speaking.

---

## Components

### Buttons

Primary buttons use the University of Graz yellow accent with black bold text. Secondary actions use a lighter ghost-button style. Disabled buttons are visually muted so that participants can see which actions are not available yet.

### Status pills

Rounded status pills are used for information such as recording progress, microphone state, and item count. Their compact shape makes status information visible without dominating the screen.

### Group selection cards

The first screen uses large selection cards for the two participant groups. The cards are designed to be visually clear and usable with mouse, touch, and keyboard input.

### Task selection cards

The task selection screen shows the available tasks as cards. Completed tasks are visually marked so participants know which parts of the session are already done.

### Consent box

The consent text is shown in a scrollable box. This keeps the screen manageable while still allowing the full information text to be available before participants continue.

### Participant details form

The participant details form uses a two-column layout on larger screens and collapses to a single column on smaller screens. Labels are connected to their inputs, and related options are grouped semantically.

### Recording screen

The recording screen is intentionally minimal. It shows the current item, the prime words, the carrier sentence, and the recording controls. The prompt text is large and centred to support reading aloud.

### Upload overlay

The upload overlay prevents participants from interacting with the task while data are being saved. This avoids accidental clicks during upload and makes the system state clear.

---

## Screen navigation flow

```text
Screen 0: Group selection
  → Screen 1: Consent
    → Screen 2: Participant details
      → Screen 3: Questionnaire, for English-speaking participants
        → Screen 4: Task selection
          → Screen 5: Task instructions
            → Screen 6: Microphone setup
              → Screen 7: Recording
                → Screen 8: Done
                  → back to Screen 4 until both tasks are complete
```

The flow is linear during each task but returns participants to the task selection screen after one task is completed. This makes it clear that both tasks need to be completed.

---

## Responsive behaviour

The design uses a responsive strategy with several breakpoints. The base layout is fluid, and smaller screens receive adjusted spacing, reduced padding, and single-column layouts.

Main responsive decisions:

* group selection cards collapse from two columns to one column
* task cards collapse from two columns to one column
* participant detail fields collapse from two columns to one column
* the shared header adapts on narrow screens
* buttons and inputs remain large enough for touch use
* prompt text remains readable on mobile screens
* spacing is reduced on narrow screens to avoid excessive scrolling

This means the final website is usable on desktop, tablet, and mobile screens.

---

## Accessibility-related design decisions

Accessibility was considered as part of the visual and interaction design.

* Strong text contrast is used throughout the interface.
* Yellow is used as an accent but not as the only source of meaning.
* Focus styles are visible for keyboard users.
* Interactive cards can be operated with keyboard input.
* Forms use labels, fieldsets, and legends.
* Buttons and inputs use large touch targets.
* Status messages use live regions where appropriate.
* Decorative confetti and spinner animations respect reduced-motion preferences.
* A skip link is provided to help users bypass repeated content.

These decisions support the selected WCAG 2.1 AA criteria documented in the project requirements.

---

## Design decisions

| Decision                                    | Reason                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Single-card interface                       | Keeps the guided task visually coherent                             |
| External CSS file                           | Separates content from presentation and improves maintainability    |
| CSS custom properties                       | Allows consistent colours and easier global changes                 |
| University of Graz yellow accent            | Connects the interface to the institutional context                 |
| Large recording prompt                      | Supports readability while speaking                                 |
| Disabled buttons until requirements are met | Prevents common user errors                                         |
| Bilingual interface in one app              | Avoids maintaining two separate websites                            |
| Local logo asset                            | Makes the site reliable on GitHub Pages                             |
| Reduced-motion support                      | Avoids forcing decorative animation on users who prefer less motion |
| Responsive card and form layouts            | Keeps the tool usable on smaller screens                            |
