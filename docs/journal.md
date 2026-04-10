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

---

## Problems Encountered

- **WAV file storage — no ideal solution found yet:** Needed a way to store uploaded WAV files server-side without setting up a dedicated backend. Current solution: files are uploaded via a Google Apps Script endpoint and saved to Google Drive. This works for now but has limitations (upload speed, file size limits, potential timeouts). A proper server-side solution is still being evaluated.

- **Silent recordings not detected:** During initial testing with a real participant, the microphone appeared to be active but was physically muted or misconfigured at the OS level. The tool generated WAV files for every item but all were silent — there was no way to know until after the session. Fixed by adding a silence detection check: after each recording stops, the peak amplitude is measured and if it falls below a threshold (`0.01`), the recording is rejected and the participant is warned before being allowed to continue.

---

## Decisions Made

- Single HTML file for the whole app — no page reloads, all screens shown/hidden with CSS
- Bilingual (EN/DE) in one file — language set at Screen 0, not a separate file
- Participant details collected once upfront, not repeated per task

---

## Things to Do Next

