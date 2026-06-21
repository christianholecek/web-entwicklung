# Requirements documentation

## Project overview

This project is a browser-based speech recording tool for phonetic research. Participants complete two vowel recording tasks, one in English and one in German. The tool supports two participant groups, native Austrian German speakers and native English speakers, and automatically displays the interface in German or English based on the group selection on the first screen.

The final website is deployed on GitHub Pages and is structured as a single-page application. The different steps of the study are shown and hidden with JavaScript rather than loading separate pages.

---

## Must-have requirements

### Group selection

* Participants choose their group on the first screen.
* The group choice determines the interface language.
* German-speaking participants see the German interface.
* English-speaking participants see the English interface.
* The group choice also determines whether the short metadata route or the longer questionnaire route is used.

### Consent

* Participants must read an information and consent text before continuing.
* The consent text is displayed in a scrollable box.
* Participants must tick a checkbox to confirm that they have read and agreed to the information.
* Participants cannot continue until consent has been confirmed.
* Separate consent texts are provided for the German and English versions of the interface.

### Participant details

Participant details are collected once and then reused for both tasks.

Required fields include:

* participant ID
* year of birth
* sex
* Austrian federal state, where applicable
* city or town where the participant grew up

The form uses associated labels for all inputs and groups related options with fieldsets and legends.

### Questionnaire

The English-speaking group is routed through an extended language background questionnaire before the tasks. The German-speaking group receives a shorter metadata route.

The questionnaire is part of the research context of the tool and collects relevant language background information before participants begin recording.

### Task selection

* Both participant groups complete both tasks.
* Participants can choose which task to complete first.
* Completed tasks are visually marked.
* After completing one task, participants return to the task selection screen.
* When both tasks are completed, a final completion screen is shown.

### Task A: English rhyming task

Task A is the English vowel task. Participants see English prime words and a carrier sentence and record both in one take.

This task was redesigned from a plain sentence-reading task into a rhyming task so that the English and German tasks use the same interaction pattern.

### Task B: German rhyming task

Task B is the German vowel task. Participants see German prime words and a German carrier sentence with a target word or nonce word and record both in one take.

### Stimulus data

The stimulus material is stored in JSON files in the `data/` folder rather than being hardcoded in the HTML. The JavaScript application loads the task data at startup and builds the recording screens dynamically.

This makes the project easier to maintain because changes to the stimulus lists can be made in the data files without changing the main HTML structure.

### Microphone setup

* Participants must enable microphone access before starting a recording task.
* The browser microphone permission is requested through the Web Audio API.
* A device picker lets participants choose from available input devices.
* A test recording is required before the task begins.
* Test recordings are not saved.
* Participants can return to the microphone setup screen from the recording screen without losing their place.

### Recording

* Participants record one item at a time.
* After recording, they can accept the take or repeat it.
* Audio is captured in the browser and encoded as WAV.
* Recordings are checked for silence before being accepted.
* Very quiet or silent recordings are rejected and participants are warned.
* Recordings are stored through Firebase Firestore in the final version.
* Session data and metadata are stored alongside the recordings.

### Interface

* The website uses one main `index.html` file.
* The CSS is stored externally in `css/styles.css`.
* The JavaScript functionality is stored in `js/app.js`.
* The stimulus and task data are stored in the `data/` folder.
* The website uses University of Graz branding, with yellow as the main accent colour and a white, black, and grey interface.
* The interface is bilingual.
* The layout is responsive and adapts to smaller screens.

---

## Responsive design requirements

The website uses a responsive design strategy with several breakpoints.

The main layout is centred and fluid. On smaller screens, padding is reduced, multi-column grids collapse into single-column layouts, and controls remain large enough to use on touchscreens.

Main responsive decisions:

* group and task selection cards collapse from two columns to one column on smaller screens
* participant detail fields collapse from two columns to one column
* the shared header adapts on narrow screens
* form elements and buttons keep usable touch target sizes
* recording prompts remain large and readable
* spacing is reduced on mobile screens to avoid unnecessary scrolling

The final design was tested and adjusted for mobile use rather than being a desktop-only prototype.

---

## Accessibility requirements

The project was designed with a selected set of WCAG 2.1 AA criteria in mind and checked with WAVE and manual inspection.

Selected criteria:

| WCAG criterion                    | How it is addressed                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1.1 Non-text content            | The University of Graz logo has alternative text.                                                                                                            |
| 1.3.1 Info and relationships      | The page uses semantic structure, headings, labelled form controls, fieldsets, and legends.                                                                  |
| 1.4.3 Contrast                    | The interface uses strong black text on white or light backgrounds. Yellow is used mainly as an accent and not as the only carrier of essential information. |
| 2.1.1 Keyboard                    | Group cards and form controls can be used with the keyboard.                                                                                                 |
| 2.4.1 Bypass blocks               | A skip link is provided for keyboard and screen reader users.                                                                                                |
| 2.4.6 Headings and labels         | Screens, form fields, and task sections use descriptive headings and labels.                                                                                 |
| 2.5.5 Target size                 | Buttons and input controls use large clickable areas for mobile and touch use.                                                                               |
| 2.3.3 Animation from interactions | Decorative animations are suppressed when the user has reduced-motion preferences enabled.                                                                   |

Automated accessibility testing was treated as a support tool rather than a complete guarantee. WAVE was used to identify common accessibility issues, and the interface was also checked manually for keyboard navigation, labels, focus visibility, and general usability.

---

## JavaScript functionality

The final page integrates and extends the functionality developed in the earlier assignment.

Implemented JavaScript features include:

* screen navigation without page reloads
* bilingual interface switching
* group-based routing
* dynamic loading of task data from JSON
* task selection and task completion tracking
* microphone permission handling
* input device selection
* test recording
* recording and re-recording workflow
* silence detection
* WAV encoding in the browser
* Firebase Firestore upload
* status messages and upload overlay
* completion animation after both tasks are finished
* reduced-motion handling for users who prefer less animation

---

## Deployment

The project is deployed through GitHub Pages.

The repository uses relative file paths so the project works both locally and when hosted on GitHub Pages.

---

## Documentation requirements

The project is documented with Markdown files in the repository. The documentation includes:

* project description
* requirements
* data and stimulus structure
* visual design decisions
* work log
* sources and external resources
* licence information

---

## Possible future extensions

The current version is complete for the final course submission, but the structure allows future extensions.

Possible future improvements include:

* adding a waveform visualiser during recording
* implementing an audio rating task
* implementing a longer reading passage task
* tightening Firebase security rules before real research use
* adding a dedicated backend for larger-scale research data collection
* further testing on iOS Safari and different microphone setups
