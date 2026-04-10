# requirements.md

## Project Overview
A browser-based speech recording tool for phonetic research. Participants record themselves reading sentences containing target vowels. The tool supports two participant groups (native Austrian German speakers and native English speakers) and displays the interface in the appropriate language based on group selection.

---

## Must-Have

### Group Selection
- On first load, participants choose their group: native Austrian German speaker or native English speaker
- This selection determines the interface language and which version of Task A they receive

### Consent
- Participants must read an information and consent text before proceeding
- Text is displayed in a scrollable box
- Participant must tick a checkbox to confirm they have read and agreed
- Declining closes the page or shows a withdrawal message

### Participant Details (collected once, used for all tasks)
- Participant ID (provided by researcher)
- Year of birth
- Sex (Female / Male / Other)
- Bundesland (Austrian federal state, dropdown)
- City / town the participant grew up in
- All fields are required before continuing

### Questionnaire
- Appears after participant details, before the tasks
- Contains language background questions
- Currently a placeholder — questions to be added later

### Task Selection
- Both tasks must be completed; participants choose which to do first
- After completing one task, participants are returned to this screen to complete the other
- Completed tasks are visually marked (checkmark / badge) so participants know what is done
- The screen shows a completion message when both tasks are done

### Tasks
- **Task A — German native speakers:** English rhyming — participants see 3 prime words and a carrier sentence; they record the primes and sentence in one take
- **Task A — English native speakers:** English reading — participants see only the carrier sentence and record it (no prime words)
- **Task B — both groups:** German rhyming — participants see 3 German prime words and a carrier sentence with a nonce word target; they record the primes and sentence in one take
- Item order is randomized per task using a fixed seed (reproducible across sessions)
- No two consecutive items share the same vowel category

### Microphone Setup
- Participants must enable microphone access before starting a task
- Device picker lets participants select from available input devices
- Test recording required before beginning (not saved)
- Silence detection warns if no audio is captured
- Participants can return to mic setup from the recording screen without losing their place in the task

### Recording
- One item at a time: participant records, accepts, then moves to the next
- Audio captured via Web Audio API, saved as WAV (16-bit mono, 48 kHz)
- Maximum recording length: 30 seconds (auto-stop)
- After accepting, recording is uploaded to server (Google Apps Script endpoint for now)
- If upload fails, file is offered as a local download fallback
- Session metadata (participant ID, task, item, filename, timestamp, duration) saved as CSV and uploaded at end of each task
- Consent and participant data uploaded as CSV once per session

### Interface
- Single HTML file (index.html) — no page reloads between screens
- University of Graz branding: yellow (#ffd500) accent, black text, white background
- Bilingual: German and English — language determined by group selection on Screen 0
- Responsive layout (desktop-first; mobile improvements planned later)

---

## Nice-to-Have (planned for later)

- Full mobile responsiveness
- Waveform visualizer during recording
- Progress bar instead of "Item X / N" pill
- Researcher-configurable stimulus lists loaded from JSON instead of hardcoded in JS

---

