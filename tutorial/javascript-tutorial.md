# JavaScript Tutorial — Speech Recording Tool

This tutorial explains the main JavaScript file of the speech recording tool. The file is stored as:

```
js/app.js
```

The JavaScript controls the interactive parts of the website. HTML provides the structure, CSS provides the visual design, and JavaScript makes the page behave like an application. It handles screen navigation, bilingual text, task loading, form validation, microphone access, recording, WAV encoding, Firebase upload, and the final completion animation.

---

## Part 1 — The wrapper function

```
(function () {
  "use strict";

  // all JavaScript code goes here

})();
```

The whole file is wrapped in an immediately invoked function expression, often shortened to IIFE.

`function () { ... }` defines an anonymous function.

The final `()` runs the function immediately.

This keeps variables such as `selectedGroup`, `sessionId`, and `recording` inside the app instead of creating many global variables on the page. That matters because global variables can accidentally clash with browser features, libraries, or other scripts.

`"use strict";` enables strict mode. Strict mode makes JavaScript less forgiving in useful ways. For example, it prevents accidental undeclared variables. This helps catch mistakes earlier.

---

## Part 2 — Configuration constants

```
const MAX_REC_SECONDS = 30;
const SILENCE_PEAK_THRESHOLD = 0.01;
const TASKS_JSON_PATH = "data/tasks.json";
```

These values configure important behaviour in one place.

`MAX_REC_SECONDS = 30` means recordings are automatically stopped after 30 seconds. This prevents a participant from accidentally recording for several minutes.

`SILENCE_PEAK_THRESHOLD = 0.01` is the threshold used for silence detection. If the loudest signal in a recording is below this value, the app treats the recording as silent and asks the participant to try again.

`TASKS_JSON_PATH = "data/tasks.json"` tells JavaScript where to find the task data. The task lists are not hardcoded in the JavaScript. Instead, they are loaded from the JSON file in the `data/` folder.

Why this matters: If the stimulus material changes, the JSON file can be edited without rewriting the main app logic.

---

## Part 3 — Short helper functions for selecting elements

```
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
```

These two helper functions make the rest of the code shorter.

`document.querySelector(s)` finds the first element that matches a CSS selector. For example:

```
$("#btnConsent")
```

means:

```
document.querySelector("#btnConsent")
```

The `#` means “find the element with this ID”.

`document.querySelectorAll(s)` finds all matching elements. It returns a NodeList, which is similar to an array but does not have every array method. `Array.from(...)` converts it into a real array.

So:

```
$$(".screen")
```

finds all elements with the class `screen`.

This is used often because the app has many screens and buttons.

---

## Part 4 — Showing one screen at a time

```
function show(el) {
  $$(".screen").forEach(x => x.classList.remove("active"));
  el.classList.add("active");
  window.scrollTo(0, 0);

  const h = el.querySelector("h2, h1");
  if (h) {
    h.setAttribute("tabindex", "-1");
    h.focus();
  }
}
```

The website is a single-page app. All screens exist in the HTML at the same time, but only one screen should be visible.

The CSS controls this with:

```
.screen { display: none; }
.screen.active { display: block; }
```

The JavaScript controls which screen has the `active` class.

`$$(".screen").forEach(...)` goes through every screen.

`x.classList.remove("active")` hides every screen by removing the active class.

`el.classList.add("active")` shows the one screen that should be visible now.

`window.scrollTo(0, 0)` moves the page back to the top after navigation. This is useful on mobile screens because the user may have scrolled down on the previous screen.

The second part improves accessibility:

```
const h = el.querySelector("h2, h1");
```

This finds the first heading in the new screen.

```
h.setAttribute("tabindex", "-1");
h.focus();
```

Normally headings cannot receive keyboard focus. Adding `tabindex="-1"` allows JavaScript to focus the heading without adding it to the normal tab order. This helps screen reader users and keyboard users understand that the screen has changed.

---

## Part 5 — Showing and hiding optional form sections

```
function toggleHidden(sel, showIt) {
  const el = typeof sel === "string" ? $(sel) : sel;
  if (el) el.classList.toggle("hidden", !showIt);
}
```

Some questionnaire sections are only relevant if the participant answers “yes” to a previous question. For example, if someone says they lived abroad before, a follow-up box appears.

`toggleHidden` is a reusable helper for this.

`sel` can be either a selector string such as `"#livedAbroadDetails"` or an actual element.

```
typeof sel === "string" ? $(sel) : sel;
```

This means: if `sel` is a string, use `$()` to find the element. Otherwise, use the element directly.

```
el.classList.toggle("hidden", !showIt);
```

This adds or removes the class `hidden`.

If `showIt` is true, `!showIt` is false, so the hidden class is removed.

If `showIt` is false, `!showIt` is true, so the hidden class is added.

The actual hiding is done by CSS. JavaScript only changes the class.

---

## Part 6 — Reading selected radio buttons

```
function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}
```

Radio buttons are grouped by their `name` attribute. In a group, only one option can be selected.

This function finds the checked radio button in a group.

For example:

```
getRadio("livedAbroad")
```

finds:

```
input[name="livedAbroad"]:checked
```

The `:checked` part means “only the selected option”.

If an option is selected, the function returns its value. If no option is selected, it returns an empty string.

This is used for validation and for saving questionnaire answers.

---

## Part 7 — Creating a session ID

```
function randToken(len = 10) {
  const a = new Uint8Array(len);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a, b => (b % 36).toString(36)).join("");
}
```

Every session gets a random session ID. This helps connect recordings, questionnaire data, and session logs without relying only on the participant ID.

`new Uint8Array(len)` creates an array of random-byte slots.

`window.crypto.getRandomValues(a)` fills the array with cryptographically strong random values.

The final line converts each number into a small alphanumeric character.

```
(b % 36).toString(36)
```

Base 36 uses digits and letters: `0–9` and `a–z`.

The result is a short random token such as:

```
k8f2h9q1mx
```

This token is not meant to be readable. It is just a practical way to identify one browser session.

---

## Part 8 — Safe timestamps for filenames

```
function isoSafeNow() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
```

This function creates a timestamp that can safely be used inside filenames.

A normal ISO timestamp contains colons, for example:

```
2026-06-21T14:30:12.123Z
```

Colons can be inconvenient in filenames on some systems. This function creates a safer version:

```
2026-06-21_14-30-12.123
```

`padStart(w, "0")` makes sure numbers have leading zeroes. For example, month `6` becomes `06`.

This function is used when naming questionnaire files, session logs, and other generated data.

---

## Part 9 — Escaping CSV values

```
function csvEscape(s) {
  const str = String(s ?? "");
  return /[",\n]/.test(str) ? `"${str.split('"').join('""')}"` : str;
}
```

CSV files separate values with commas. This causes a problem if a participant answer itself contains a comma, quote mark, or line break.

This function makes CSV values safe.

`String(s ?? "")` converts the value into a string. If the value is `null` or `undefined`, it becomes an empty string.

```
/[",\n]/.test(str)
```

This checks whether the string contains a quote mark, comma, or line break.

If it does, the value is wrapped in double quotes. Any existing double quote is doubled.

For example:

```
He said "hello", then stopped.
```

becomes:

```
"He said ""hello"", then stopped."
```

This is standard CSV escaping.

---

## Part 10 — Local download fallback

```
function saveLocal(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
```

This function creates a local download if upload fails.

`blob` is the file-like object, for example a WAV recording or CSV file.

`URL.createObjectURL(blob)` creates a temporary browser URL for that file.

An `<a>` element is created in JavaScript. Its `href` points to the temporary file URL, and its `download` attribute tells the browser what filename to use.

```
a.click();
```

This programmatically clicks the link, which starts the download.

```
URL.revokeObjectURL(url)
```

This frees the temporary object URL afterwards so the browser does not keep unnecessary memory.

Why this matters: If Firebase upload fails, the participant’s recording is not simply lost. The app can offer the file as a local download.

---

## Part 11 — Seeded pseudo-random order

```
function mulberry32(seed) {
  let t = seed >>> 0;

  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
```

The app needs a shuffled task order, but it should also be reproducible. A normal random shuffle would be different every time.

`mulberry32` is a seeded pseudo-random number generator.

The same seed always produces the same sequence of numbers.

For example, if Task A uses seed `1337`, the order will always be the same for that task. This is useful for research because the order is controlled and can be reproduced.

```
function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

This is a Fisher-Yates shuffle.

It starts at the end of the array and swaps each item with a random earlier item.

`[arr[i], arr[j]] = [arr[j], arr[i]]` is destructuring assignment. It swaps two array values without needing a temporary variable.

---

## Part 12 — Building task items from JSON

```
function buildRhymingItems(taskDef) {
  const { id, lang, vowels, carriers, seed } = taskDef;

  const raw = [];
  for (const v of vowels) {
    raw.push({ vKey: v.key, cond: "C1" });
    raw.push({ vKey: v.key, cond: "C2" });
  }

  const rng = mulberry32(seed);
  shuffleInPlace(raw, rng);

  // avoid same vowel twice in a row

  const byKey = Object.fromEntries(vowels.map(v => [v.key, v]));

  return raw.map(({ vKey, cond }) => {
    const v = byKey[vKey];

    return {
      taskId: id,
      lang: lang,
      condition: cond,
      targetToken: v.targetToken,
      primes: v.primes,
      promptText: carriers[cond]
    };
  });
}
```

The task data comes from JSON. This function turns the JSON definition into the actual recording items shown to the participant.

`const { id, lang, vowels, carriers, seed } = taskDef;` extracts properties from the task object.

The loop creates two raw items per vowel:

```
C1
C2
```

That means each vowel appears in two carrier sentence conditions.

The raw list is then shuffled with the seeded random generator.

The code also checks for adjacent repeated vowel categories and tries to swap them away. This avoids showing the same vowel category twice in a row.

```
Object.fromEntries(vowels.map(v => [v.key, v]))
```

This creates a lookup object. Instead of searching through the whole vowel list every time, the app can directly find a vowel by its key.

The final `map` creates the objects that the recording screen needs, including target token, primes, language, condition, and prompt text.

---

## Part 13 — Session state

```
const sessionId = randToken(10);
const sessionStartIso = new Date().toISOString();

let selectedGroup = null;
let allTaskDefs = {};
let builtTasks = {};
let completedTasks = new Set();

let selectedTaskId = null;
let taskItems = [];
let itemIdx = 0;
let currentItem = null;
```

The app needs to remember what is currently happening. This is called state.

`sessionId` identifies the current browser session.

`sessionStartIso` stores the start time.

`selectedGroup` is either `"EN"` or `"DE"` after the participant chooses a group.

`allTaskDefs` stores the raw task definitions from JSON.

`builtTasks` stores the processed task items that are ready to display.

`completedTasks` is a `Set`. A Set stores unique values. This is useful because a task should only count as completed once.

`selectedTaskId` stores the task currently being completed.

`taskItems` stores the list of items in that task.

`itemIdx` is the current item number.

`currentItem` is the item currently visible on the recording screen.

Together, these variables let the app know where the participant is in the flow.

---

## Part 14 — Participant metadata

```
let meta = {
  pid: "",
  birthYear: "",
  sex: "",
  bundesland: "",
  city: ""
};
```

This object stores participant metadata collected at the beginning.

`pid` is the researcher-assigned participant ID.

`birthYear`, `sex`, `bundesland`, and `city` are collected in the participant details form.

The same metadata is reused later when naming files and uploading data.

Why this matters: The participant should not have to enter the same information again for every task.

---

## Part 15 — Loading the JSON task file

```
async function loadTasks() {
  const res = await fetch(TASKS_JSON_PATH);
  const json = await res.json();

  for (const [key, def] of Object.entries(json)) {
    if (key.startsWith("_")) continue;

    allTaskDefs[key] = def;

    if (def.type === "rhyming") {
      builtTasks[key] = { ...def, items: buildRhymingItems(def) };
    }
  }
}
```

`async` marks the function as asynchronous. It can wait for something that takes time, such as loading a file.

```
await fetch(TASKS_JSON_PATH)
```

loads `data/tasks.json`.

```
await res.json()
```

converts the response into a JavaScript object.

`Object.entries(json)` loops over the entries in the JSON file.

```
if (key.startsWith("_")) continue;
```

Entries starting with `_` are skipped. This allows the JSON file to include notes or future task definitions that should not be loaded as active tasks.

```
if (def.type === "rhyming")
```

Only rhyming tasks are currently implemented.

```
builtTasks[key] = { ...def, items: buildRhymingItems(def) };
```

The spread syntax `...def` copies the task definition. Then `items` is added as a new property.

This means the app keeps the original task metadata and adds the generated recording items.

---

## Part 16 — Bilingual interface text

```
const UI = {
  EN: {
    headerTitle: "Speech Recording",
    consentTitle: "Participant Information & Consent",
    micTitle: "Microphone setup",
    startRec: "Start recording"
  },

  DE: {
    headerTitle: "Sprachaufnahme",
    consentTitle: "Teilnehmerinformation & Einwilligung",
    micTitle: "Mikrofon einrichten",
    startRec: "Aufnahme starten"
  }
};
```

The interface text is stored in one central object.

There is one section for English and one section for German.

This is better than scattering English and German text throughout the code. If a label needs to change, it can be changed in one place.

The selected group controls which language is applied.

---

## Part 17 — Applying the selected language

```
function applyLanguage(group) {
  const t = UI[group];

  document.documentElement.lang = group === "DE" ? "de" : "en";

  setText("headerTitle", t.headerTitle);
  setText("consentTitle", t.consentTitle);
  setText("btnInit", t.micEnable);
  setText("btnStartRec", t.startRec);

  buildTaskGrid(group);
}
```

This function updates the visible interface language.

`const t = UI[group];` selects the correct text object.

If `group` is `"DE"`, `t` becomes `UI.DE`. If `group` is `"EN"`, it becomes `UI.EN`.

```
document.documentElement.lang = group === "DE" ? "de" : "en";
```

This updates the `<html lang="">` attribute. This is important for accessibility because screen readers need to know which language they are reading.

`setText(...)` updates specific HTML elements by ID.

Finally, `buildTaskGrid(group)` rebuilds the task selection cards in the correct language.

---

## Part 18 — Text helper functions

```
function setText(id, val) {
  const el = $(id.startsWith("#") ? id : `#${id}`);
  if (el) el.textContent = val;
}

function setHTML(id, val) {
  const el = $(id.startsWith("#") ? id : `#${id}`);
  if (el) el.innerHTML = val;
}

function setAttr(id, attr, val) {
  const el = $(id.startsWith("#") ? id : `#${id}`);
  if (el) el[attr] = val;
}
```

These helper functions avoid repeating the same code many times.

`setText` changes only the text content of an element. This is the safest option for normal labels.

`setHTML` inserts HTML content. This is used for longer instruction blocks where formatting is needed.

`setAttr` changes a property such as `textContent` or another element property.

The `id.startsWith("#")` check means the function accepts both `"headerTitle"` and `"#headerTitle"`.

---

## Part 19 — Building the task selection grid

```
function buildTaskGrid(group) {
  const grid = $("#taskGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const t = UI[group];

  for (const [key, def] of Object.entries(builtTasks)) {
    const name = t[`taskName${def.id}`] || def.name_en || key;
    const desc = t[`taskDesc${def.id}`] || "";

    const card = document.createElement("div");
    card.className = "task-card";
    card.id = `btnPick${def.id}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    card.innerHTML = `
      <h3>${name}</h3>
      <p>${desc}</p>
    `;

    grid.appendChild(card);

    card.addEventListener("click", () => {
      if (!completedTasks.has(key)) pickTask(key);
    });

    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!completedTasks.has(key)) pickTask(key);
      }
    });
  }
}
```

The task grid is built dynamically from `builtTasks`.

First, the grid is cleared:

```
grid.innerHTML = "";
```

Then the function loops through the available tasks.

```
document.createElement("div")
```

creates a new card.

```
card.className = "task-card";
```

gives it the CSS class that controls how it looks.

```
card.setAttribute("role", "button");
card.setAttribute("tabindex", "0");
```

These two lines improve accessibility. The card behaves like a button and can be reached with the keyboard.

There are two event listeners.

The click listener handles mouse and touch users.

The keydown listener handles keyboard users. It activates the card when the user presses Enter or Space.

---

## Part 20 — Updating completed task cards

```
function updateTaskGrid() {
  for (const [key, def] of Object.entries(builtTasks)) {
    const card = $(`#btnPick${def.id}`);
    if (!card) continue;

    if (completedTasks.has(key)) {
      card.classList.add("done");
      card.setAttribute("tabindex", "-1");
    } else {
      card.classList.remove("done");
      card.setAttribute("tabindex", "0");
    }
  }
}
```

This function updates the task cards after a task is finished.

If a task is completed, the card gets the class `done`.

The CSS can then style the completed task differently.

```
card.setAttribute("tabindex", "-1");
```

This removes the completed card from normal keyboard navigation. The participant should not accidentally start a completed task again.

If the task is not completed, the card remains keyboard-accessible with `tabindex="0"`.

---

## Part 21 — Screen references

```
const screens = {
  group: $("#scr-group"),
  consent: $("#scr-consent"),
  detailsDE: $("#scr-details-de"),
  detailsEN: $("#scr-details-en"),
  taskselect: $("#scr-taskselect"),
  instr: $("#scr-instr"),
  mic: $("#scr-mic"),
  run: $("#scr-run"),
  done: $("#scr-done")
};
```

This object stores references to the main screens.

Instead of writing:

```
$("#scr-consent")
```

every time, the code can write:

```
screens.consent
```

This makes navigation more readable.

For example:

```
show(screens.consent);
```

means “show the consent screen”.

---

## Part 22 — Group selection

```
function selectGroup(group) {
  selectedGroup = group;
  applyLanguage(group);
  show(screens.consent);
}
```

When a participant selects a group, the app stores the group, applies the correct language, and moves to the consent screen.

```
$("#btnGroupEN").addEventListener("click", () => selectGroup("EN"));
$("#btnGroupDE").addEventListener("click", () => selectGroup("DE"));
```

These lines attach click events to the group cards.

The group cards also have keyboard handling:

```
function handleGroupCardKey(e, group) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    selectGroup(group);
  }
}
```

This makes the group cards usable without a mouse.

---

## Part 23 — Consent checkbox

```
const consentChk = $("#consentChk");
const btnConsent = $("#btnConsent");

consentChk.addEventListener("change", () => {
  btnConsent.disabled = !consentChk.checked;
});
```

The participant cannot continue until the consent checkbox is ticked.

`change` runs whenever the checkbox changes.

`consentChk.checked` is true when the checkbox is ticked.

```
btnConsent.disabled = !consentChk.checked;
```

If the checkbox is not checked, the button is disabled. If the checkbox is checked, the button is enabled.

```
btnConsent.addEventListener("click", () => {
  if (!consentChk.checked) return;

  consentGiven = true;
  consentTimeIso = new Date().toISOString();

  show(selectedGroup === "DE" ? screens.detailsDE : screens.detailsEN);
});
```

When the participant continues, the app stores that consent was given and records the time.

Then it routes the participant to the correct details screen.

German-speaking participants go to the shorter metadata form.

English-speaking participants go to the longer route.

---

## Part 24 — Checking required participant details

```
const deFields = ["de-pid", "de-birthYear", "de-sex", "de-state", "de-city"];

function checkDeForm() {
  const ok = deFields.every(id => {
    const el = $(`#${id}`);
    return el && String(el.value || "").trim();
  });

  $("#btnDeDetailsContinue").disabled = !ok;
}
```

This checks whether all required fields in the German participant details form have been filled in.

`deFields` is a list of input IDs.

`.every(...)` checks whether every field passes the test.

```
String(el.value || "").trim()
```

converts the field value to a string and removes whitespace at the beginning and end.

If every field contains something, `ok` is true and the continue button is enabled.

The same pattern is used for the English details form.

---

## Part 25 — Storing participant metadata

```
$("#btnDeDetailsContinue").addEventListener("click", () => {
  meta.pid = $("#de-pid").value.trim();
  meta.birthYear = $("#de-birthYear").value.trim();
  meta.sex = $("#de-sex").value;
  meta.bundesland = $("#de-state").value;
  meta.city = $("#de-city").value.trim();

  show(screens.taskselect);
  updateTaskGrid();
});
```

When the participant clicks continue, the form values are copied into the `meta` object.

This means later functions do not need to read the form fields again.

The app then shows the task selection screen and updates the task cards.

---

## Part 26 — Computed questionnaire values

```
function computeDerived() {
  const currentYear = new Date().getFullYear();
  const birth = parseInt(meta.birthYear, 10);
  const arrival = parseInt(($("#arrivalYear") || {}).value || "", 10);

  if ($("#derivedAge")) {
    $("#derivedAge").value = Number.isFinite(birth) ? String(currentYear - birth) : "";
  }

  if ($("#derivedAgeMigration")) {
    $("#derivedAgeMigration").value =
      (Number.isFinite(birth) && Number.isFinite(arrival)) ? String(arrival - birth) : "";
  }

  if ($("#derivedDuration")) {
    $("#derivedDuration").value =
      Number.isFinite(arrival) ? String(currentYear - arrival) : "";
  }
}
```

Some questionnaire values can be calculated automatically.

For example, if the participant gives year of birth and year of arrival in Austria, the app can calculate:

* current age
* age at migration
* length of residence

`parseInt(..., 10)` converts a string into a number.

`Number.isFinite(...)` checks whether the result is a valid number.

If the necessary values are available, the calculated field is filled in. If not, it stays empty.

---

## Part 27 — Creating repeated scale questions

```
function createScaleBlock(name, label, n, leftLabel, rightLabel) {
  const wrap = document.createElement("div");
  wrap.className = "q-card";

  const legend = document.createElement("fieldset");
  legend.innerHTML = `<legend>${label}</legend>`;

  const row = document.createElement("div");
  row.className = "choice-inline";

  for (let i = 1; i <= n; i++) {
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="radio" name="${name}" value="${i}"> ${i}`;
    row.appendChild(lab);
  }

  legend.appendChild(row);
  wrap.appendChild(legend);

  return wrap;
}
```

The questionnaire contains many similar rating scales.

Instead of writing the same HTML by hand again and again, JavaScript creates the scale blocks automatically.

`name` is the radio group name.

`label` is the question text.

`n` is the number of scale points, for example 5 or 10.

The loop creates one radio button for each number.

This reduces repeated HTML and makes the questionnaire easier to maintain.

---

## Part 28 — Conditional questionnaire logic

```
function setupConditionalLogic() {
  const wire = (names, handler) => {
    (Array.isArray(names) ? names : [names]).forEach(name => {
      $$(`input[name="${name}"]`).forEach(el => el.addEventListener("change", handler));
    });
  };

  wire("livedAbroad", () => {
    toggleHidden("#livedAbroadDetails", getRadio("livedAbroad") === "1");
  });
}
```

Some questions reveal follow-up questions.

The helper function `wire` attaches the same change handler to all radio buttons with a given name.

For example, the follow-up section for living abroad is shown only if the participant selects the answer with value `"1"`.

```
getRadio("livedAbroad") === "1"
```

This checks whether the yes-option is selected.

```
toggleHidden("#livedAbroadDetails", ...)
```

This shows or hides the follow-up section.

This approach keeps the form shorter and prevents participants from seeing irrelevant questions.

---

## Part 29 — Validating visible questionnaire questions

```
function validateVisibleScreen(screenEl) {
  if (!screenEl) return true;

  const radios = Array.from(screenEl.querySelectorAll('input[type="radio"]'));
  const radioNames = new Set(radios.map(el => el.name).filter(Boolean));

  for (const name of radioNames) {
    const inputs = radios.filter(el => el.name === name);
    const anyVisible = inputs.some(el => el.offsetParent !== null);
    if (!anyVisible) continue;

    const answered = inputs.some(el => el.checked);
    if (!answered) return false;
  }

  return true;
}
```

This function checks whether all visible radio groups on the current questionnaire screen have been answered.

`querySelectorAll('input[type="radio"]')` finds all radio buttons on the screen.

`new Set(...)` creates a list of unique radio group names.

For each group, the code checks whether at least one option is visible.

```
el.offsetParent !== null
```

This is used as a practical visibility check. If a conditional section is hidden, its inputs do not need to be answered.

If a visible group has no selected answer, the function returns false.

This prevents the participant from continuing before answering required visible questions.

---

## Part 30 — Questionnaire navigation

```
function qNav(to) {
  show(screens[to]);
}

function qNavGuarded(fromKey, toKey) {
  const fromEl = screens[fromKey];

  if (!validateVisibleScreen(fromEl)) {
    showValidationAlert();
    return;
  }

  show(screens[toKey]);
}
```

`qNav` moves directly to another questionnaire screen.

`qNavGuarded` first validates the current screen.

If required questions are missing, the app shows an alert and stops.

If the screen is complete, the next screen is shown.

This pattern is used for the multi-step questionnaire because each page should be completed before moving on.

---

## Part 31 — Collecting questionnaire data

```
function valueOf(id) {
  return ($(`#${id}`)?.value || "");
}

function checked01(id) {
  return $(`#${id}`)?.checked ? "1" : "0";
}

function checkboxList(name) {
  return $$(`input[name="${name}"]:checked`).map(el => el.value).join("|");
}
```

These small helpers collect values from different form types.

`valueOf(id)` gets the value of a normal input or select field.

`checked01(id)` converts a checkbox into `"1"` or `"0"`.

`checkboxList(name)` collects all checked boxes in a checkbox group and joins them with `|`.

For example:

```
English|German|Other
```

This is useful because CSV only has one cell for each variable.

---

## Part 32 — Creating a CSV file in the browser

```
function buildCsvBlob(data) {
  const header = Object.keys(data);
  const row = header.map(k => data[k]);

  return new Blob(
    [[header.join(","), row.map(csvEscape).join(",")].join("\n")],
    { type: "text/csv" }
  );
}
```

This function turns a JavaScript object into a CSV file.

`Object.keys(data)` creates the header row.

`header.map(k => data[k])` creates the data row in the same order.

`csvEscape` is applied to each value so commas, quotes, and line breaks do not break the CSV.

`new Blob(...)` creates a file-like object in the browser.

The browser can then upload this Blob to Firebase or offer it as a local download.

---

## Part 33 — Firebase setup

```
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "webdesign-a3cfe.firebaseapp.com",
  projectId: "webdesign-a3cfe",
  storageBucket: "webdesign-a3cfe.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};

const firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
```

Firebase is used to store recordings and session data.

The Firebase SDK is loaded in `index.html` before `app.js`, so the global `firebase` object is available when this code runs.

`firebase.initializeApp(FIREBASE_CONFIG)` connects the website to the Firebase project.

`firebase.firestore()` creates a reference to the Firestore database.

Firestore is used instead of Firebase Storage because Firebase Storage requires a paid plan. For this course project, WAV files are base64-encoded and stored as Firestore documents.

Important: This setup is enough to demonstrate the technical workflow, but real research data collection would require stricter Firestore security rules and a proper data protection review.

---

## Part 34 — Uploading files to Firestore

```
async function uploadBlob(blob, filename, pid, taskId, itemLabel) {
  const base64 = await new Promise((res, rej) => {
    const fr = new FileReader();

    fr.onerror = rej;
    fr.onload = () => res(String(fr.result).split(",")[1]);

    fr.readAsDataURL(blob);
  });

  const isWav = blob.type === "audio/wav" || filename.endsWith(".wav");
  const collection = isWav ? "recordings" : "sessions";

  const doc = {
    filename,
    pid,
    session_id: sessionId,
    task_id: taskId,
    item_label: itemLabel,
    group: selectedGroup,
    mime: blob.type,
    data_base64: base64,
    uploaded_at: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(collection).add(doc);
}
```

This function uploads either a WAV recording or a CSV/session file.

Firestore cannot directly store a Blob as a normal file, so the Blob is converted to base64.

`FileReader` reads the Blob.

`readAsDataURL(blob)` produces a long string that starts with a prefix such as:

```
data:audio/wav;base64,...
```

The code splits the string at the comma and keeps only the base64 data.

```
const isWav = blob.type === "audio/wav" || filename.endsWith(".wav");
```

This checks whether the file is a recording.

WAV files go into the `recordings` collection.

CSV/session files go into the `sessions` collection.

```
uploaded_at: firebase.firestore.FieldValue.serverTimestamp()
```

This stores the upload time according to the Firebase server, not the participant’s computer.

---

## Part 35 — The upload overlay

```
function setOverlay(on, title, msg) {
  overlayTitle.textContent = title || "";
  overlayMsg.textContent = msg || "";
  overlay.classList.toggle("active", !!on);
}
```

The overlay appears while files are being uploaded.

`title` and `msg` set the text displayed in the overlay.

```
overlay.classList.toggle("active", !!on);
```

If `on` is true, the overlay becomes visible.

If `on` is false, it is hidden.

The CSS decides what `.overlay.active` looks like. JavaScript only adds or removes the class.

This prevents the participant from clicking other buttons while upload is in progress.

---

## Part 36 — Choosing a task

```
function pickTask(taskKey) {
  if (completedTasks.has(taskKey)) return;

  selectedTaskId = taskKey;

  const def = builtTasks[taskKey];
  taskItems = def ? def.items.slice() : [];
  itemIdx = 0;
  currentItem = null;

  const t = UI[selectedGroup];
  const name = t[`taskName${def.id}`] || def.name_en;
  const html = t[`instrHtml${def.id}`] || "<p>Instructions not available.</p>";

  $("#instrTitle").textContent = name;
  $("#instrBody").innerHTML = html;

  show(screens.instr);
}
```

This function starts the selected task flow.

If the task is already completed, the function stops immediately.

`selectedTaskId` stores which task is active.

`taskItems = def.items.slice()` copies the task item list. `slice()` creates a new array so the original task definition is not changed accidentally.

`itemIdx = 0` starts at the first item.

The correct instruction text is selected from the bilingual UI object.

Then the instruction screen is shown.

---

## Part 37 — Microphone state variables

```
let micReady = false;
let audioCtx = null;
let stream = null;
let source = null;
let workletNode = null;

let recording = false;
let recBuffers = [];
let totalLength = 0;
let sampleRate = 48000;
```

The microphone part of the app needs several state variables.

`micReady` becomes true once the microphone has been successfully started.

`audioCtx` is the Web Audio API audio context.

`stream` is the microphone stream received from the browser.

`source` connects the microphone stream to the audio processing graph.

`workletNode` receives audio samples from the microphone.

`recording` tracks whether the app is currently recording.

`recBuffers` stores chunks of audio while recording.

`totalLength` stores the total number of audio samples collected.

`sampleRate` is the number of samples per second. The app aims for 48,000 Hz.

---

## Part 38 — Starting the microphone

```
async function initMic() {
  if (micReady) return;

  $("#btnInit").disabled = true;
  setMicStatus(selectedGroup === "DE" ? "Mikrofon wird gestartet…" : "mic: starting…");

  const constraints = {
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    noiseSuppression: false,
    echoCancellation: false,
    autoGainControl: false
  };

  stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
}
```

`initMic` starts the microphone.

`navigator.mediaDevices.getUserMedia(...)` asks the browser for microphone access. The browser then shows a permission prompt.

The constraints request:

* one audio channel
* 48 kHz sample rate if possible
* no noise suppression
* no echo cancellation
* no automatic gain control

Those processing options are turned off because this is a phonetic recording tool. The goal is to record speech as directly as possible, not to make it sound like a video call.

`AudioContext` starts the Web Audio API system. `webkitAudioContext` is included as a fallback for some browsers.

---

## Part 39 — AudioWorklet processing

```
const workletCode = `
  class P extends AudioWorkletProcessor {
    process(inputs) {
      const ch = inputs[0];
      if (!ch || !ch.length) return true;

      const n = ch[0].length;
      const mono = new Float32Array(n);

      for (let c = 0; c < ch.length; c++) {
        if (ch[c]) {
          for (let i = 0; i < n; i++) {
            mono[i] += ch[c][i] / ch.length;
          }
        }
      }

      this.port.postMessage(mono);
      return true;
    }
  }

  registerProcessor('rec-p', P);
`;
```

This code runs inside an AudioWorklet.

The AudioWorklet receives small chunks of audio from the microphone.

`inputs[0]` is the input audio.

The code creates a `Float32Array` called `mono`.

If the microphone provides more than one channel, the channels are averaged into one mono signal.

```
this.port.postMessage(mono);
```

This sends the mono audio chunk back to the main JavaScript code.

The app stores these chunks when recording is active.

Why this matters: The Web Audio API gives access to raw audio samples, which the app can later encode as a WAV file.

---

## Part 40 — Receiving audio chunks

```
workletNode.port.onmessage = (e) => {
  const d = e.data;

  if (testRecording) updatePeak(d, true);
  if (recording) updatePeak(d, false);

  if (testRecording) {
    const c = new Float32Array(d.length);
    c.set(d);
    testBuffers.push(c);
    testTotalLength += c.length;
    computeLevel(c);
    return;
  }

  if (recording) {
    const c = new Float32Array(d.length);
    c.set(d);
    recBuffers.push(c);
    totalLength += c.length;
    computeLevel(c);
    return;
  }

  computeLevel(d);
};
```

This is the main receiver for audio chunks.

If a test recording is active, the chunk is added to `testBuffers`.

If a real task recording is active, the chunk is added to `recBuffers`.

The code copies the chunk into a new `Float32Array` before storing it. This avoids problems if the original buffer is reused internally by the browser.

`updatePeak` tracks the loudest sample. This is used for silence detection.

`computeLevel` calculates a live microphone level display.

If nothing is recording, the app still computes the level so the participant can see that the microphone is receiving audio.

---

## Part 41 — Silence detection

```
function updatePeak(arr, isTest) {
  let peak = 0;

  for (let i = 0; i < arr.length; i++) {
    const a = Math.abs(arr[i]);
    if (a > peak) peak = a;
  }

  if (isTest) {
    testPeak = Math.max(testPeak, peak);
  } else {
    recPeak = Math.max(recPeak, peak);
  }
}
```

The audio samples are floating point numbers, usually between -1 and 1.

`Math.abs(...)` turns negative values into positive values, because loudness can be positive or negative in a waveform.

The function finds the largest absolute sample value in the chunk.

If the peak stays below `SILENCE_PEAK_THRESHOLD`, the app treats the recording as silent.

This was added because a microphone can appear active even when it is physically muted or incorrectly configured.

---

## Part 42 — Encoding audio as WAV

```
function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, s, true);
  }
}
```

This converts floating point audio samples into 16-bit PCM samples.

The Web Audio API gives samples as floating point numbers.

A WAV file usually stores PCM values as integers.

```
Math.max(-1, Math.min(1, input[i]))
```

This clamps the sample so it cannot go below -1 or above 1.

`0x8000` and `0x7FFF` are hexadecimal numbers for the 16-bit integer range.

```
view.setInt16(offset, s, true)
```

This writes one 16-bit sample into the file buffer.

The final `true` means little-endian byte order, which is standard for WAV files.

---

## Part 43 — Writing the WAV header

```
function writeWavHeader(view, sr, nCh, nFrames) {
  const wr = (v, o, s) => {
    for (let i = 0; i < s.length; i++) {
      v.setUint8(o + i, s.charCodeAt(i));
    }
  };

  const bps = 2;
  const ba = nCh * bps;
  const br = sr * ba;

  wr(view, 0, "RIFF");
  view.setUint32(4, 36 + nFrames * ba, true);
  wr(view, 8, "WAVE");
  wr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, nCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, br, true);
  view.setUint16(32, ba, true);
  view.setUint16(34, 16, true);
  wr(view, 36, "data");
  view.setUint32(40, nFrames * ba, true);
}
```

A WAV file is not only raw audio data. It also needs a header that tells audio software what the file contains.

The header includes:

* file type: `RIFF` and `WAVE`
* format chunk: `fmt`
* number of channels
* sample rate
* byte rate
* bit depth
* data size

`nCh` is the number of channels. The app writes mono WAV files, so this is usually 1.

`sr` is the sample rate.

`nFrames` is the number of audio samples.

This function writes the technical header before the actual audio data.

---

## Part 44 — Combining buffers into one WAV Blob

```
function encodeWavFromBuffers(buffers, totalLen) {
  const mono = new Float32Array(totalLen);
  let off = 0;

  for (const b of buffers) {
    mono.set(b, off);
    off += b.length;
  }

  const buf = new ArrayBuffer(44 + mono.length * 2);
  const view = new DataView(buf);

  writeWavHeader(view, sampleRate, 1, mono.length);
  floatTo16BitPCM(view, 44, mono);

  return new Blob([view], { type: "audio/wav" });
}
```

Recordings are collected in many small chunks. This function combines them into one continuous array.

`new Float32Array(totalLen)` creates one large array with enough space for all samples.

The loop copies each small buffer into the correct position.

The WAV header is 44 bytes long, so the audio data starts at byte 44.

`mono.length * 2` is used because each 16-bit sample takes 2 bytes.

The final result is a Blob with MIME type `audio/wav`.

This Blob can be uploaded to Firestore or saved locally.

---

## Part 45 — Test recording

```
function startTest() {
  if (!micReady || !audioCtx) return;

  testRecording = true;
  testBuffers = [];
  testTotalLength = 0;
  testBlob = null;
  testReady = false;
  testPeak = 0;

  setTestStatus(selectedGroup === "DE" ? "Test: läuft…" : "test: recording…");

  $("#btnTestStart").disabled = true;
  $("#btnTestStop").disabled = false;
  $("#btnBeginTask").disabled = true;
}
```

The test recording checks whether the microphone works before the participant starts the real task.

The test buffers are cleared.

The peak value is reset to zero.

The start button is disabled and the stop button is enabled.

The task cannot begin until a valid test recording has been completed.

```
function stopTest() {
  if (!testRecording) return;

  testRecording = false;

  if (testPeak < SILENCE_PEAK_THRESHOLD) {
    setTestStatus(selectedGroup === "DE" ? "Test: kein Ton erkannt ⚠" : "test: no audio detected ⚠");
    alert("No audio detected.");
    resetTestUI();
    return;
  }

  testBlob = encodeWavFromBuffers(testBuffers, testTotalLength);
  testReady = true;

  $("#btnTestPlay").disabled = false;
  $("#btnTestRedo").disabled = false;
  $("#btnBeginTask").disabled = false;
}
```

When the test stops, the app checks whether sound was detected.

If the test is silent, the test is rejected.

If sound is detected, the app encodes the test as a WAV Blob and enables playback. The participant can listen to it, redo it, or begin the task.

Test recordings are not uploaded.

---

## Part 46 — Rendering the current recording item

```
function renderCurrentItem() {
  const def = builtTasks[selectedTaskId];
  const t = UI[selectedGroup];
  const N = taskItems.length || 0;

  $("#runTaskLabel").textContent = t[`taskName${def.id}`] || def.name_en;
  $("#runProgress").textContent = `Item ${itemIdx + 1} / ${N}`;

  currentItem = taskItems[itemIdx] || null;

  const primesBox = $("#primesBox");
  const primesWords = $("#primesWords");

  if (currentItem?.primes?.length) {
    primesBox.style.display = "block";
    primesWords.innerHTML = "";

    currentItem.primes.forEach(w => {
      const span = document.createElement("span");
      span.className = "prime-word";
      span.textContent = w;
      primesWords.appendChild(span);
    });
  }

  $("#promptDisplay").textContent = currentItem ? currentItem.promptText : "—";
}
```

This function updates the recording screen for the current item.

It sets the task name and progress indicator.

It gets the current item from the task item list.

If the item has prime words, each prime word is turned into a `<span>` with class `prime-word`. CSS then styles those spans as rounded word pills.

The sentence prompt is placed into `#promptDisplay`.

This function runs at the beginning of a task and after every accepted recording.

---

## Part 47 — Starting a task recording

```
function startRecording() {
  if (recording || !audioCtx) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  recBuffers = [];
  totalLength = 0;
  lastBlob = null;
  lastDuration = 0;
  recPeak = 0;

  recording = true;

  $("#runStatus").textContent = selectedGroup === "DE" ? "läuft…" : "recording…";
  $("#btnStartRec").disabled = true;
  $("#btnStopRec").disabled = false;
  $("#btnNext").disabled = true;

  recStartMs = Date.now();
}
```

This starts the real recording for one task item.

The previous recording buffers are cleared.

The recording peak is reset to zero.

`recording = true` tells the AudioWorklet message handler to store incoming audio chunks in `recBuffers`.

The buttons are updated:

* Start is disabled
* Stop is enabled
* Next is disabled until a valid recording exists

`recStartMs` stores the start time so the app can stop automatically after the maximum duration.

---

## Part 48 — Stopping a task recording

```
function stopRecording() {
  if (!recording) return;

  recording = false;

  if (recPeak < SILENCE_PEAK_THRESHOLD) {
    $("#runStatus").textContent = selectedGroup === "DE" ? "kein Ton erkannt ⚠" : "no audio detected ⚠";
    alert("No audio detected in this recording.");

    lastBlob = null;
    lastDuration = 0;

    $("#btnStopRec").disabled = true;
    $("#btnNext").disabled = true;
    $("#btnStartRec").disabled = false;

    return;
  }

  lastBlob = encodeWav();
  lastDuration = totalLength / sampleRate;
  lastRecPeak = recPeak;

  $("#runStatus").textContent = selectedGroup === "DE" ? "gestoppt" : "stopped";
  $("#btnStopRec").disabled = true;
  $("#btnNext").disabled = false;
}
```

This stops the current recording.

First, `recording` is set to false so new audio chunks are no longer stored.

Then the app checks the peak amplitude.

If the recording is silent, it is rejected and the participant can record again.

If sound was detected, the buffers are encoded as a WAV file.

`lastDuration = totalLength / sampleRate` calculates the duration in seconds.

The Next button is enabled only after a valid recording exists.

---

## Part 49 — Naming WAV files

```
function nextTakeNumber(pid, targetToken, lang, cond) {
  const key = `${pid}__${targetToken}__${lang}__${cond}`;
  const n = (takeCounters[key] || 0) + 1;
  takeCounters[key] = n;
  return String(n).padStart(2, "0");
}

function buildWavName(item) {
  const tok = sanitizeToken(item.targetToken || "unknown");
  const take = nextTakeNumber(meta.pid, tok, item.lang, item.condition);

  return `${meta.pid}_${tok}_${item.lang}_${item.condition}_${take}.wav`;
}
```

Each accepted recording receives a structured filename.

The filename includes:

* participant ID
* target token
* language
* condition
* take number

`sanitizeToken` removes characters that could be awkward in filenames.

The take counter makes repeated attempts clear. For example:

```
P001_heed_en_C1_01.wav
P001_heed_en_C1_02.wav
```

This helps organise the data later.

---

## Part 50 — Accepting and saving a recording

```
async function acceptAndSave() {
  if (!lastBlob || !currentItem) {
    alert("Please record the sentence first.");
    return;
  }

  const wavName = buildWavName(currentItem);
  const acceptedAt = new Date().toISOString();

  setOverlay(true, UI[selectedGroup].overlayUpload, UI[selectedGroup].overlayWait);

  try {
    await uploadBlob(lastBlob, wavName, meta.pid, selectedTaskId);
    $("#runStatus").textContent = selectedGroup === "DE" ? "hochgeladen ✓" : "uploaded ✓";
  } catch (e) {
    saveLocal(lastBlob, wavName);
    $("#runStatus").textContent = selectedGroup === "DE" ? "lokal gespeichert" : "saved locally";
  }

  sessionRows.push([
    sessionId,
    sessionStartIso,
    meta.pid,
    selectedGroup,
    selectedTaskId,
    currentItem.lang,
    currentItem.condition,
    currentItem.targetToken,
    String(itemIdx + 1),
    currentItem.promptText,
    currentItem.primes ? currentItem.primes.join("|") : "",
    wavName,
    acceptedAt,
    lastDuration.toFixed(3),
    String(sampleRate)
  ]);

  setOverlay(false);
  nextItem();
}
```

This function saves the current recording.

First, it checks that a valid recording exists.

Then it builds a filename and shows the upload overlay.

`await uploadBlob(...)` uploads the WAV file to Firestore.

If upload fails, the `catch` block saves the file locally instead. This fallback reduces the risk of losing participant data.

After saving, the app adds one row to `sessionRows`. This row stores metadata about the recording, such as participant ID, task, item, prompt, filename, duration, and sample rate.

Finally, the overlay is hidden and the app moves to the next item.

---

## Part 51 — Moving through items and finishing a task

```
function nextItem() {
  itemIdx++;

  if (itemIdx >= taskItems.length) {
    finishTask();
    return;
  }

  renderCurrentItem();
}
```

This moves to the next item.

If there are no more items, the task is finished.

Otherwise, the next prompt is rendered.

```
async function finishTask() {
  const csvBlob = buildSessionCsvBlob();
  const csvName = `${meta.pid}__${selectedTaskId}__SESSION__${isoSafeNow()}__S${sessionId}.csv`;

  setOverlay(true, "Uploading session log…", UI[selectedGroup].overlayWait);

  try {
    await uploadBlob(csvBlob, csvName, meta.pid, selectedTaskId, "session_log");
  } catch (e) {
    saveLocal(csvBlob, csvName);
  } finally {
    setOverlay(false);
  }

  completedTasks.add(selectedTaskId);

  const allDone = completedTasks.size >= Object.keys(builtTasks).length;

  if (!allDone) {
    updateTaskGrid();
    show(screens.taskselect);
    return;
  }

  show(screens.done);
  launchConfetti();
}
```

When a task ends, the app creates and uploads a session log CSV.

If upload fails, the CSV is saved locally.

Then the task is added to `completedTasks`.

If not all tasks are completed, the participant returns to the task selection screen.

If all tasks are completed, the final done screen is shown and the confetti animation runs.

---

## Part 52 — Session CSV rows

```
const CSV_HEADER = [
  "session_id",
  "session_start_iso",
  "participant_id",
  "group",
  "task",
  "lang",
  "condition",
  "target_token",
  "item_index",
  "prompt_text",
  "primes",
  "filename_wav",
  "accepted_at_iso",
  "duration_seconds",
  "sample_rate_hz"
];
```

The session CSV records one row per accepted item.

The header defines the columns.

This makes the data easier to interpret later because each WAV file can be linked back to the task item, prompt, condition, and participant session.

The CSV is created at the end of each task.

---

## Part 53 — Confetti animation

```
function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const pieces = ["🎉", "🎊", "✨", "⭐", "🌟", "🎈", "💛"];
  const count = 60;
  const container = $("#confettiContainer") || document.body;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");

    el.className = "confetti-piece";
    el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    el.style.left = (Math.random() * 100) + "vw";
    el.style.fontSize = (14 + Math.random() * 22) + "px";
    el.style.animationDuration = (1.8 + Math.random() * 2.4) + "s";
    el.style.animationDelay = (Math.random() * 2.5) + "s";

    container.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}
```

This function creates the final emoji confetti animation.

The first line checks the user’s reduced-motion preference.

```
prefers-reduced-motion: reduce
```

If the user prefers reduced motion, the function stops immediately. This avoids forcing unnecessary animation on users who may find motion distracting or uncomfortable.

The loop creates 60 emoji elements.

Each piece gets:

* a random emoji
* a random horizontal position
* a random font size
* a random animation duration
* a random animation delay

When the CSS animation ends, the element removes itself from the page.

This keeps the DOM clean.

---

## Part 54 — Event listeners for recording controls

```
$("#btnStartRec").addEventListener("click", startRecording);
$("#btnStopRec").addEventListener("click", stopRecording);
$("#btnNext").addEventListener("click", acceptAndSave);
```

These lines connect the recording buttons to their functions.

When the participant clicks Start, `startRecording` runs.

When they click Stop, `stopRecording` runs.

When they click Next, `acceptAndSave` runs.

The HTML button IDs, CSS button styling, and JavaScript event listeners work together:

* HTML creates the button
* CSS makes it look like a button
* JavaScript makes it do something

---

## Part 55 — Initialisation

```
loadTasks().catch(err => {
  console.error("Failed to load tasks.json:", err);
  alert("Could not load task data. Please check that tasks.json is in the data/ folder and reload the page.");
});
```

At the end of the file, the app loads the task data.

If loading succeeds, the app waits for the user to choose a group.

If loading fails, the error is printed to the browser console and the participant sees an alert.

This is important because the recording tasks cannot work without the JSON task file.

---

## Part 56 — How the JavaScript fits together

The JavaScript can be understood as a sequence of responsibilities:

1. Load task data from `data/tasks.json`.
2. Wait for the participant to choose a group.
3. Apply the correct interface language.
4. Show the consent screen.
5. Collect participant details.
6. Route English-speaking participants through the questionnaire.
7. Build the task selection screen.
8. Start microphone setup.
9. Require a successful test recording.
10. Show each recording item.
11. Record audio through the Web Audio API.
12. Reject silent recordings.
13. Encode valid recordings as WAV.
14. Upload recordings and CSV data to Firestore.
15. Mark tasks as completed.
16. Show the final completion screen.

This is why the JavaScript file is the core of the application. The HTML contains all screens, the CSS controls appearance and responsiveness, and the JavaScript connects everything into a working speech recording tool.
