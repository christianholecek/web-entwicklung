# journal.md

## Work Log

**March 2026 — Stimulus design**
Designed the linguistic materials for both tasks. Defined the vowel categories, selected carrier phrases (e.g. "Say h__d again." / "Er hat H__t gesagt."), and chose rhyming prime words for each vowel target.

**21.–22. March 2026 — First prototype**
Started building the first version of the tool. Discussed with agent and made decisions on: consent flow and how consent data should be stored, microphone access via the Web Audio API, WAV file encoding in the browser, the overall screen flow, and upload to Google Apps Script. Built and tested a working prototype with recording functionality.

**10. April 2026 — GitHub setup**
Created repository `web-entwicklung` on GitHub. GitHub Pages enabled — site live at `https://christianholecek.github.io/web-entwicklung`.

**10. April 2026 — Prototype redesigned**
Rebuilt `index.html` from scratch as a clean skeleton with all 9 screens and full CSS. Key additions compared to the March prototype: bilingual support (EN/DE based on group selection on Screen 0), a dedicated questionnaire screen, and participant details collected once upfront rather than per task.

**10. April 2026 — Docs written**
Generated `requirements.md`, `data.md`, `visual-design.md`, and `journal.md` based on all decisions made so far.

**15. June 2026 — Major restructure and feature completion**
Consolidated multiple prototype versions into one unified codebase. Split the previously single-file app into separate files following the required folder structure: `index.html`, `css/styles.css`, `js/app.js`, `data/tasks.json`, and `imprint.html`. All paths are relative so the tool works when opened locally or hosted on GitHub Pages without any server setup.

Key changes and additions in this session:

- **Task A redesigned:** English Task A was previously plain sentence reading (no primes). It has been redesigned to match Task B's rhyming format — participants now see 3 English prime words and a carrier sentence and record both in one take. Both tasks now use the same interaction pattern.
- **Stimulus data moved to JSON:** All vowel lists, prime words, carrier sentences, and task metadata have been extracted from the JavaScript and placed in `data/tasks.json`. The JS reads this file at startup and builds the item lists dynamically. A `"type"` field was added to each task definition so the system can support additional task types in the future without changing the core JS logic.
- **Future task types planned:** The JSON structure includes placeholder definitions for two additional task types — `"rating"` (participant listens to a recording and rates nativeness on a 1–5 scale) and `"reading"` (participant reads a text passage displayed on screen). These are not implemented yet but the data structure is ready for them.
- **Group routing fully implemented:** Selecting the DE group at Screen 0 now routes participants through a short metadata form only (participant ID, year of birth, sex, Bundesland, city) and skips the full questionnaire. Selecting EN routes through the full 8-step questionnaire before the tasks. Both groups then complete both tasks.
- **Both groups do both tasks:** Previously only one task was assigned per group. The requirement was changed — all participants complete both the English rhyming task and the German rhyming task.
- **Full bilingual UI:** All interface text — buttons, labels, instructions, status messages, alerts, mic setup, recording screen, done screen — is now available in both English and German. The language switches automatically based on group selection at Screen 0 and is applied from a single UI string object in `app.js`.
- **Bilingual consent texts:** Separate consent texts written for EN and DE groups, both shown in a scrollable box with the existing scroll hint and checkbox pattern.
- **Accessibility improvements:** All form inputs now have properly associated `<label>` elements via `for`/`id`. Radio button groups and checkbox groups are wrapped in `<fieldset>`/`<legend>` for screen reader compatibility. Group selection cards are keyboard-navigable (Enter/Space). Focus is moved to the screen heading on each navigation. ARIA live regions added to status pills and the recording prompt. Minimum touch target sizes (44px) applied to all buttons and inputs for mobile usability. Reduced motion preference respected — confetti and spinner animations are suppressed when the user has `prefers-reduced-motion` enabled.
- **Confetti animation kept:** The emoji confetti animation (🎉🎊✨⭐🌟🎈💛) from the earlier demo file fires when both tasks are completed.
- **Imprint updated:** `imprint.html` now uses `css/styles.css` for styling (no inline styles), includes the FWF project description in both English and German, and links to the project website at `pronunciation-attrition.uni-graz.at`.

---

## Problems Encountered

- **WAV file storage — no ideal solution found yet:** Needed a way to store uploaded WAV files server-side without setting up a dedicated backend. Current solution: files are uploaded via a Google Apps Script endpoint and saved to Google Drive. This works for now but has limitations (upload speed, file size limits, potential timeouts). Migration to Firebase is planned.

- **Silent recordings not detected:** During initial testing with a real participant, the microphone appeared to be active but was physically muted or misconfigured at the OS level. The tool generated WAV files for every item but all were silent — there was no way to know until after the session. Fixed by adding a silence detection check: after each recording stops, the peak amplitude is measured and if it falls below a threshold (`0.01`), the recording is rejected and the participant is warned before being allowed to continue.

---

## Decisions Made

- Single HTML file for the whole app — no page reloads, all screens shown/hidden with CSS
- Bilingual (EN/DE) in one file — language set at Screen 0, not a separate file
- Participant details collected once upfront, not repeated per task
- Stimulus data stored in `data/tasks.json`, not hardcoded in JS — makes it easier to add or change stimuli without touching the application code
- Tasks defined with a `"type"` field in the JSON so future task types (rating, reading) can be added by extending the data file and adding a renderer in `app.js`, without restructuring the whole app
- Both participant groups (DE and EN) complete both tasks (English rhyming + German rhyming)
- DE group gets a short metadata form; EN group gets the full 8-step questionnaire
- All CSS in one external file (`css/styles.css`) — no inline styles anywhere, including `imprint.html`
- Upload stays on Google Apps Script / Google Drive for now; Firebase migration planned later
- Accessibility and mobile responsiveness addressed in this session; WAVE/axe audit and further mobile testing planned as a separate milestone

---

**15. June 2026 — Firebase migration**
Replaced Google Apps Script / Google Drive upload with Firebase Firestore. Firebase Storage requires a paid plan so Firestore is used instead — WAV files are base64-encoded and stored as documents in a `recordings` collection; CSV files (consent, questionnaire, session log) go into a `sessions` collection. The Firebase JS SDK (compat version 10.12.0) is loaded via CDN in `index.html` before `app.js`. Firebase project: `webdesign-a3cfe` (Spark plan, free tier). Firestore database running in test mode — security rules to be tightened before real data collection.

---

## Things to Do Next

- Run accessibility audit using WAVE (wave.webaim.org) or axe DevTools once the site is hosted
- Test on mobile devices (iOS Safari in particular has stricter Web Audio API behaviour)
- Migrate file upload from Google Apps Script / Google Drive to Firebase
- Write JavaScript tutorial documentation (equivalent to the existing CSS tutorial)
- Update `requirements.md` and `data.md` to reflect current state
- Add full English rhyming vowel list to `tasks.json` (currently has correct structure and seed; verify item count and prime words match stimulus design)
- Eventually: implement `"rating"` task type (audio playback + 1–5 Likert scale) and `"reading"` task type (text passage display + recording)
