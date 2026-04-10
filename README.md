# Vowel Recorder

A browser-based speech recording tool for phonetic research. Participants record themselves reading sentences containing English and German vowel targets.

## What it does

- Guides participants through a consent and setup flow
- Supports two participant groups: native Austrian German speakers and native English speakers
- Displays rhyming prime words and carrier sentences for each recording item
- Records audio via the Web Audio API and uploads WAV files to a server
- Bilingual interface (English / German) based on group selection

## For participants

Just open the link: https://christianholecek.github.io/web-entwicklung

No installation needed. Use Chrome or Edge for best results.

## For developers / local setup

1. Clone this repository
2. Open `index.html` with the VS Code Live Server extension
3. Chrome or Edge recommended for microphone access

No build step or installation required — the entire application is contained in `index.html`.

## Repository structure

- `index.html` — the entire application (HTML, CSS and JavaScript in one file)
- `img/` — University of Graz logo
- `data/` — stimulus lists as JSON files (`stimuli_task_a.json`, `stimuli_task_b.json`)
- `docs/` — project documentation (requirements, data, visual design, journal)
- `tutorial/` — HTML and CSS tutorial
