# Vowel Recorder

A browser-based bilingual speech recording tool for phonetic research. Participants complete English and German vowel recording tasks through a guided web interface. The project was developed for the course **Web Design with Agentic LLMs** and is deployed through GitHub Pages.

## Live website

[Open the deployed website](https://christianholecek.github.io/web-entwicklung/)

No installation is needed for participants. Chrome or Edge are recommended because microphone access and Web Audio API behaviour are most reliable there.

## Project description

The website guides participants through a complete speech-recording workflow:

* group selection for native Austrian German speakers or native English speakers
* bilingual interface in German or English
* participant information and consent
* participant metadata form
* extended questionnaire route for English-speaking participants
* task selection screen
* microphone setup and test recording
* English rhyming vowel task
* German rhyming vowel task
* silence detection for unusable recordings
* WAV encoding in the browser
* Firebase Firestore upload
* final completion screen with decorative emoji confetti

The project is structured as a single-page application. The different screens are present in `index.html` and are shown or hidden with JavaScript. Styling is handled through an external CSS file, and the task/stimulus material is loaded from JSON data.

## How to use the website

Participants open the deployed GitHub Pages link and follow the instructions on screen.

The basic flow is:

1. Choose participant group.
2. Read the consent information.
3. Enter participant details.
4. Complete the questionnaire if routed to it.
5. Choose one of the two recording tasks.
6. Set up and test the microphone.
7. Record each prompt.
8. Complete the second task.
9. Finish the session.

The tool is intended as a course project and technical prototype. Before use with real research participants, Firebase security rules and the broader data protection setup would need to be reviewed and tightened.

## Local setup

To run the project locally:

1. Clone or download this repository.
2. Open the folder in Visual Studio Code.
3. Start the project with the Live Server extension.
4. Open the local address in Chrome or Edge.

A local server is recommended because the app loads JSON data from the `data/` folder. Opening `index.html` directly from the file system may block `fetch()` in some browsers.

No build step or package installation is required.

## Repository structure

```text
index.html                  Main HTML structure and app screens
imprint.html                Imprint page
css/styles.css              Visual design, layout, accessibility styles, responsive rules
js/app.js                   Main JavaScript application logic
data/tasks.json             Task and stimulus configuration
data/stimuli_task_A.json    English task stimulus data, if used separately
data/stimuli_task_B.json    German task stimulus data, if used separately
img/                        Local image assets
docs/                       Project documentation
tutorial/                   HTML/CSS and JavaScript tutorials
```

## Documentation

The repository contains Markdown documentation for the project:

```text
docs/requirements.md        Functional, technical, responsive, and accessibility requirements
docs/data.md                Data, stimulus, output, and storage documentation
docs/visual_design.md       Visual design and responsive design decisions
docs/journal.md             Work log, problems encountered, and final validation notes
tutorial/html-css-tutorial.md
tutorial/javascript-tutorial.md
```

The documentation describes the final project structure, design decisions, accessibility checks, WAVE results, HTML validation, and possible future extensions.

## Accessibility

The project was developed with a selected set of WCAG 2.1 AA criteria in mind. The final deployed version was checked with WAVE and manual inspection.

The WAVE check showed:

* 0 errors
* 0 contrast errors
* 0 alerts

Manual checks focused on:

* semantic page structure
* one visible `h1`
* heading hierarchy
* form labels
* fieldsets and legends
* keyboard navigation
* visible focus states
* touch target sizes
* reduced-motion support
* general readability

Automated tools cannot guarantee full accessibility on their own, so WAVE was used together with manual inspection.

## Validation

The deployed page was checked with the Nu HTML Checker. After fixing the semantic placement of the `article` element and adding a hidden heading to the recording section, the page passed validation without errors or warnings.

## Responsive design

The website uses a responsive layout with several breakpoints. The design adapts from a centred desktop card layout to narrower mobile layouts.

Important responsive decisions include:

* group and task cards collapse from two columns to one column
* form fields collapse from two columns to one column
* the shared header adapts on narrow screens
* recording prompts remain readable on mobile
* buttons and inputs keep usable touch target sizes
* spacing is reduced on smaller screens

## Main technologies

* HTML5
* CSS3
* JavaScript
* Web Audio API
* AudioWorklet
* Firebase Firestore
* GitHub Pages
* WAVE accessibility checker
* Nu HTML Checker

## Sources and external code

* University of Graz logo: stored locally in `img/logo_uni_graz_4c.jpg`, used for institutional branding.
* Firebase SDK: loaded via Google Firebase CDN.
* Firebase Firestore: used for storing session data and encoded recording data.
* Web Audio API: used for microphone access and browser-based recording.
* Custom HTML, CSS, JavaScript, and task data were created for this course project with support from agentic LLM tools.
* Stimulus material was created for the phonetic recording task and is stored in the `data/` folder.

## Licence and reuse

This repository is submitted as university coursework.

Unless otherwise stated, the custom code may be reused with permission from the author. The University of Graz logo, research context, and stimulus materials are not licensed for reuse and remain subject to their respective rights and research-use context.

No separate open-source licence has been applied yet.
