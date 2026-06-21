# journal.md

## Work Log

**March 2026 — Stimulus design**

Designed the linguistic materials for both tasks. Defined the vowel categories, selected carrier phrases, for example "Say h__d again." and "Er hat H__t gesagt.", and chose rhyming prime words for each vowel target.

**21.–22. March 2026 — First prototype**

Started building the first version of the tool. Discussed the project with an agent and made decisions on the consent flow, how consent data should be stored, microphone access via the Web Audio API, WAV file encoding in the browser, the overall screen flow, and upload to Google Apps Script. Built and tested a working prototype with recording functionality.

**10. April 2026 — GitHub setup**

Created the repository `web-entwicklung` on GitHub. GitHub Pages was enabled, and the site went live at `https://christianholecek.github.io/web-entwicklung`.

**10. April 2026 — Prototype redesigned**

Rebuilt `index.html` from scratch as a clean skeleton with all 9 screens and full CSS. Key additions compared to the March prototype included bilingual support, with English or German based on group selection on Screen 0, a dedicated questionnaire screen, and participant details collected once upfront rather than per task.

**10. April 2026 — Docs written**

Generated `requirements.md`, `data.md`, `visual-design.md`, and `journal.md` based on the decisions made so far.

**15. June 2026 — Major restructure and feature completion**

Consolidated multiple prototype versions into one unified codebase. Split the previously single-file app into separate files following the required folder structure: `index.html`, `css/styles.css`, `js/app.js`, `data/tasks.json`, and `imprint.html`. All paths are relative so the tool works when opened locally or hosted on GitHub Pages without additional server setup.

Key changes and additions in this session:

* **Task A redesigned:** English Task A was previously plain sentence reading without primes. It was redesigned to match Task B's rhyming format. Participants now see 3 English prime words and a carrier sentence and record both in one take. Both tasks now use the same interaction pattern.
* **Stimulus data moved to JSON:** All vowel lists, prime words, carrier sentences, and task metadata were extracted from the JavaScript and placed in `data/tasks.json`. The JavaScript reads this file at startup and builds the item lists dynamically. A `"type"` field was added to each task definition so the system can support additional task types in the future without changing the core JavaScript logic.
* **Future task types planned:** The JSON structure includes placeholder definitions for two additional task types, `"rating"` and `"reading"`. The rating task would let participants listen to a recording and rate nativeness on a 1–5 scale. The reading task would show a text passage for recording. These are not implemented yet, but the data structure is ready for them.
* **Group routing fully implemented:** Selecting the DE group at Screen 0 routes participants through a short metadata form only, with participant ID, year of birth, sex, Bundesland, and city. Selecting EN routes participants through the full 8-step questionnaire before the tasks. Both groups then complete both tasks.
* **Both groups do both tasks:** Previously only one task was assigned per group. The requirement was changed so that all participants complete both the English rhyming task and the German rhyming task.
* **Full bilingual UI:** All interface text, including buttons, labels, instructions, status messages, alerts, microphone setup, recording screen, and done screen, is now available in both English and German. The language switches automatically based on group selection at Screen 0 and is applied from a single UI string object in `app.js`.
* **Bilingual consent texts:** Separate consent texts were written for EN and DE groups. Both are shown in a scrollable box with the existing scroll hint and checkbox pattern.
* **Accessibility improvements:** All form inputs now have properly associated `<label>` elements via `for` and `id`. Radio button groups and checkbox groups are wrapped in `<fieldset>` and `<legend>` for screen reader compatibility. Group selection cards are keyboard-navigable with Enter and Space. Focus is moved to the screen heading on each navigation. ARIA live regions were added to status pills and the recording prompt. Minimum touch target sizes of 44px were applied to buttons and inputs for mobile usability. Reduced motion preference is respected, so confetti and spinner animations are suppressed when the user has `prefers-reduced-motion` enabled.
* **Confetti animation kept:** The emoji confetti animation from the earlier demo file fires when both tasks are completed.
* **Imprint updated:** `imprint.html` now uses `css/styles.css` for styling, with no inline styles. It includes the FWF project description in both English and German and links to the project website at `pronunciation-attrition.uni-graz.at`.

---

## Problems Encountered

* **WAV file storage:** The first working prototype used a Google Apps Script endpoint and Google Drive to store uploaded WAV files. This worked for testing, but it had limitations, including upload speed, file size limits, possible timeouts, and a less suitable structure for the final project. The final version was therefore migrated to Firebase Firestore.

* **Firebase Storage not available on the free plan:** Firebase Storage would have been a more direct solution for storing audio files, but it requires a paid Firebase plan. As a workaround for the course project, WAV files are base64-encoded and stored as documents in a Firestore `recordings` collection. Consent, questionnaire, and session log data are stored in a `sessions` collection.

* **Silent recordings not detected:** During initial testing with a real participant, the microphone appeared to be active but was physically muted or misconfigured at the operating-system level. The tool generated WAV files for every item, but all were silent. This was fixed by adding a silence detection check. After each recording stops, the peak amplitude is measured. If it falls below the threshold, the recording is rejected and the participant is warned before continuing.

* **Data protection and security rules:** Firestore is suitable for demonstrating the technical workflow in the course project, but the database is not yet ready for real research data collection. Before using the tool with real participants, Firestore security rules and the broader data protection setup would need to be reviewed and tightened.

---

## Decisions Made

* Single HTML file for the main app, with no page reloads between screens
* Semantic HTML structure with header, navigation, main content, article, sections, and footer
* Bilingual interface in one app, with language set through the group choice on Screen 0
* Participant details collected once upfront, not repeated for each task
* Stimulus data stored in `data/tasks.json`, not hardcoded in the HTML or JavaScript
* Tasks defined with a `"type"` field in the JSON so future task types can be added more easily
* Both participant groups complete both tasks, the English rhyming task and the German rhyming task
* German-speaking participants receive a short metadata form
* English-speaking participants receive the full questionnaire route
* CSS stored externally in `css/styles.css`
* JavaScript stored externally in `js/app.js`
* Imprint page styled through the shared CSS file rather than inline styles
* Upload migrated from Google Apps Script and Google Drive to Firebase Firestore
* Silence detection added to reduce the risk of unusable recordings
* Accessibility improvements added, including labels, fieldsets, legends, keyboard-navigable group cards, focus management, ARIA live regions, minimum touch target sizes, and reduced-motion support
* Mobile responsiveness addressed with responsive layout rules and smaller-screen adjustments

---

**15. June 2026 — Firebase migration**

Replaced the previous Google Apps Script and Google Drive upload workflow with Firebase Firestore. Firebase Storage requires a paid plan, so Firestore is used instead for the course project. WAV files are base64-encoded and stored as documents in a `recordings` collection. Consent, questionnaire, and session log data are stored in a `sessions` collection. The Firebase JS SDK, compat version 10.12.0, is loaded via CDN in `index.html` before `app.js`. Firebase project: `webdesign-a3cfe`, Spark plan, free tier. Firestore is currently suitable for demonstrating the project workflow, but security rules would need to be tightened before real research use.

---

**June 2026 — Final HTML and accessibility checks**

Before submission, the deployed GitHub Pages version was checked with WAVE. The WAVE report showed 0 errors, 0 contrast errors, and 0 alerts. WAVE identified the existing alternative text, form labels, structural elements, and ARIA attributes, which reflects the accessibility work added during the final development phase.

The page was also checked with the Nu HTML Checker. After fixing the semantic placement of the `<article>` element and adding a hidden heading to the recording section, the deployed page passed validation with no errors or warnings.

Because automated accessibility tools cannot guarantee full WCAG compliance on their own, the page was also reviewed manually. The manual check focused on keyboard navigation, visible focus states, labelled form controls, semantic structure, heading hierarchy, touch target sizes, reduced-motion behaviour, and general readability. The selected WCAG 2.1 AA criteria are documented in the requirements and accessibility documentation.

---

## Things to Do Next

* Eventually: implement the planned `"rating"` task type with audio playback and a 1–5 rating scale
* Eventually: implement the planned `"reading"` task type with text passage display and recording
