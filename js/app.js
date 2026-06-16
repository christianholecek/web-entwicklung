(function () {
  "use strict";

  /* ═══════════════════════════════════════════
     CONFIG
  ═══════════════════════════════════════════ */
  const MAX_REC_SECONDS       = 30;
  const SILENCE_PEAK_THRESHOLD = 0.01;
  const TASKS_JSON_PATH        = "data/tasks.json";

  /* ═══════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════ */
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function show(el) {
    $$(".screen").forEach(x => x.classList.remove("active"));
    el.classList.add("active");
    window.scrollTo(0, 0);
    // move focus to the first heading in the new screen for screen readers
    const h = el.querySelector("h2, h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
  }

  function toggleHidden(sel, showIt) {
    const el = typeof sel === "string" ? $(sel) : sel;
    if (el) el.classList.toggle("hidden", !showIt);
  }

  function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  }

  function randToken(len = 10) {
    const a = new Uint8Array(len);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, b => (b % 36).toString(36)).join("");
  }

  function isoSafeNow() {
    const d   = new Date();
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }

  function csvEscape(s) {
    const str = String(s ?? "");
    return /[",\n]/.test(str) ? `"${str.split('"').join('""')}"` : str;
  }

  function saveLocal(blob, filename) {
    const a   = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function sanitizeToken(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  /* ═══════════════════════════════════════════
     PSEUDO-RANDOM SHUFFLE (seeded — same order every run)
  ═══════════════════════════════════════════ */
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ═══════════════════════════════════════════
     TASK BUILDER — rhyming type
     Works for both English (Task A) and German (Task B)
     Reads vowel list + carriers + seed from JSON task object.
     Produces: 2 items per vowel (C1 + C2), shuffled with
     the constraint that the same vowel never appears twice in a row.
  ═══════════════════════════════════════════ */
  function buildRhymingItems(taskDef) {
    const { id, lang, vowels, carriers, seed } = taskDef;

    // One C1 + one C2 per vowel
    const raw = [];
    for (const v of vowels) {
      raw.push({ vKey: v.key, cond: "C1" });
      raw.push({ vKey: v.key, cond: "C2" });
    }

    // Seeded shuffle
    const rng = mulberry32(seed);
    shuffleInPlace(raw, rng);

    // Fix adjacencies: no same vowel twice in a row
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].vKey === raw[i - 1].vKey) {
        let j = i + 1;
        while (j < raw.length && raw[j].vKey === raw[i].vKey) j++;
        if (j < raw.length) [raw[i], raw[j]] = [raw[j], raw[i]];
      }
    }

    // Build item objects
    const byKey = Object.fromEntries(vowels.map(v => [v.key, v]));
    return raw.map(({ vKey, cond }) => {
      const v = byKey[vKey];
      return {
        taskId:      id,
        lang:        lang,
        condition:   cond,
        targetToken: v.targetToken,
        primes:      v.primes,
        promptText:  carriers[cond]
      };
    });
  }

  /* ═══════════════════════════════════════════
     SESSION STATE
  ═══════════════════════════════════════════ */
  const sessionId       = randToken(10);
  const sessionStartIso = new Date().toISOString();

  let selectedGroup   = null;   // "EN" | "DE"
  let allTaskDefs     = {};     // raw JSON task definitions
  let builtTasks      = {};     // { taskId: { ...def, items: [...] } }
  let completedTasks  = new Set();

  let consentGiven     = false;
  let consentTimeIso   = "";
  let consentUploaded  = false;
  let questionnaireUploaded = false;

  let selectedTaskId   = null;
  let taskItems        = [];
  let itemIdx          = 0;
  let currentItem      = null;
  let returnToRunAfterMic = false;

  /* ─── participant metadata (filled from whichever details form is shown) ─── */
  let meta = {
    pid: "", birthYear: "", sex: "", bundesland: "", city: ""
  };

  /* ═══════════════════════════════════════════
     LOAD TASKS FROM JSON
  ═══════════════════════════════════════════ */
  async function loadTasks() {
    const res  = await fetch(TASKS_JSON_PATH);
    const json = await res.json();

    // Only process keys that don't start with "_" (those are comments/planned)
    for (const [key, def] of Object.entries(json)) {
      if (key.startsWith("_")) continue;
      allTaskDefs[key] = def;

      if (def.type === "rhyming") {
        builtTasks[key] = { ...def, items: buildRhymingItems(def) };
      }
      // Future: "rating", "reading" etc. handled here
    }
  }

  /* ═══════════════════════════════════════════
     BILINGUAL CONTENT
  ═══════════════════════════════════════════ */
  const UI = {
    EN: {
      headerTitle:       "Speech Recording",
      consentTitle:      "Participant Information & Consent",
      consentChkLabel:   "I have read the information above and I consent to participate in this study.",
      consentAgree:      "Agree and continue",
      consentDecline:    "Decline",
      consentFootnote:   "You must tick the box above to continue.",
      scrollHint:        "Scroll inside the box to read all information ↓",
      taskSelTitle:      "Choose a task",
      taskSelSubtitle:   "Please complete both tasks — you may do them in any order.",
      taskSelFootnote:   "Please take a break of at least 15 minutes between tasks if completing both in one session.",
      instrOk:           "I understand — continue",
      instrBack:         "Back",
      micTitle:          "Microphone setup",
      micSubtitle:       "Click Enable microphone and allow access when prompted. Then complete a short test recording.",
      micHint:           "If your recordings are silent, select a different device and redo the test.",
      micFootnote:       "If you encounter any problems, please try Chrome or Edge.",
      micEnable:         "Enable microphone",
      micBegin:          "Begin task",
      micBackToTask:     "Back to task",
      micRefresh:        "Refresh",
      testBoxTitle:      "Test recording",
      testBoxInstr:      'Press <strong>Start test</strong>, wait one second, read the sentence, wait one second, then press <strong>Stop test</strong>. Test recordings are <strong>not saved</strong>.',
      testPrompt:        '"The North Wind and the Sun were disputing which was the stronger."',
      testStart:         "Start test",
      testStop:          "Stop test",
      testPlay:          "Play back",
      testRedo:          "Redo",
      testNotRecorded:   "Not recorded",
      primesLabel:       "Say these three words aloud first:",
      runHintPrimes:     "Press <strong>Start recording</strong>. Say the three words above, then read the sentence. Press <strong>Stop</strong>, then <strong>Next</strong>.",
      runHintNoPrimes:   "Press <strong>Start recording</strong>, read the sentence once, press <strong>Stop</strong>, then <strong>Next</strong>.",
      startRec:          "Start recording",
      stopRec:           "Stop",
      accept:            "Accept & save",
      next:              "Next ▶",
      goMic:             "Microphone setup",
      doneTitle:         "Task complete ✓",
      doneBackMsg:       "You still need to complete the other task. Click below to go back and start it.",
      doneAllDoneMsg:    "You have completed both tasks. Thank you very much for participating!",
      doneBack:          "Back to task selection",
      doneFootnote:      "If any upload failed, the files were saved as local downloads instead.",
      imprintLink:       "Impressum / Imprint",
      overlayUpload:     "Uploading… please wait",
      overlayWait:       "Do not close this tab.",
      overlaySubmit:     "Submitting questionnaire…",
      overlayProcess:    "Processing…",
      taskNameA:         "Task A — English Rhyming",
      taskNameB:         "Task B — German Rhyming",
      taskDescA:         "Say three rhyming words, then record the English sentence.",
      taskDescB:         "Say three rhyming words, then record the German sentence.",
      instrHtmlA: `
        <p><strong>Task A — English Rhyming:</strong> For each item:</p>
        <ul>
          <li>You will see <strong>three English words</strong> that rhyme with the missing word.</li>
          <li>Press <strong>Start recording</strong>.</li>
          <li>In the <strong>same recording</strong>, first say the <strong>three words</strong>, then read the <strong>sentence</strong> aloud.</li>
          <li>The missing word may be a nonsense word — that is expected. Please say it as shown.</li>
          <li>Press <strong>Stop</strong>, then <strong>Next</strong>.</li>
        </ul>`,
      instrHtmlB: `
        <p><strong>Task B — German Rhyming:</strong> For each item:</p>
        <ul>
          <li>You will see <strong>three German words</strong> that rhyme with the missing word. The sentence shows <strong>H__t</strong> as a clue.</li>
          <li>Press <strong>Start recording</strong>.</li>
          <li>In the <strong>same recording</strong>, first say the <strong>three words</strong>, then read the <strong>sentence</strong> aloud.</li>
          <li>The missing word may be a nonsense word — that is expected. Please say it as shown.</li>
          <li>Press <strong>Stop</strong>, then <strong>Next</strong>.</li>
        </ul>`
    },
    DE: {
      headerTitle:       "Sprachaufnahme",
      consentTitle:      "Teilnehmerinformation & Einwilligung",
      consentChkLabel:   "Ich habe die obigen Informationen gelesen und stimme der Teilnahme zu.",
      consentAgree:      "Zustimmen und weiter",
      consentDecline:    "Ablehnen",
      consentFootnote:   "Sie müssen das Kästchen oben ankreuzen, um fortzufahren.",
      scrollHint:        "Im Feld scrollen, um alle Informationen zu lesen ↓",
      taskSelTitle:      "Aufgabe auswählen",
      taskSelSubtitle:   "Bitte absolvieren Sie beide Aufgaben — die Reihenfolge ist frei wählbar.",
      taskSelFootnote:   "Bitte machen Sie eine Pause von mindestens 15 Minuten zwischen den Aufgaben, wenn Sie beide in einer Sitzung absolvieren.",
      instrOk:           "Ich habe verstanden — weiter",
      instrBack:         "Zurück",
      micTitle:          "Mikrofon einrichten",
      micSubtitle:       'Klicken Sie auf „Mikrofon aktivieren" und erlauben Sie den Zugriff. Machen Sie dann eine kurze Testaufnahme.',
      micHint:           "Falls Ihre Aufnahmen stumm sind, wählen Sie ein anderes Gerät und wiederholen Sie den Test.",
      micFootnote:       "Falls Sie Probleme haben, versuchen Sie bitte Chrome oder Edge.",
      micEnable:         "Mikrofon aktivieren",
      micBegin:          "Aufgabe starten",
      micBackToTask:     "Zurück zur Aufgabe",
      micRefresh:        "Aktualisieren",
      testBoxTitle:      "Testaufnahme",
      testBoxInstr:      'Drücken Sie <strong>Test starten</strong>, warten Sie eine Sekunde, lesen Sie den Satz, warten Sie eine Sekunde und drücken Sie dann <strong>Test stoppen</strong>. Testaufnahmen werden <strong>nicht gespeichert</strong>.',
      testPrompt:        '"Der Nordwind und die Sonne stritten sich, wer von ihnen stärker sei."',
      testStart:         "Test starten",
      testStop:          "Test stoppen",
      testPlay:          "Abspielen",
      testRedo:          "Wiederholen",
      testNotRecorded:   "Nicht aufgezeichnet",
      primesLabel:       "Sagen Sie zuerst diese drei Wörter laut:",
      runHintPrimes:     "Drücken Sie <strong>Aufnahme starten</strong>. Sagen Sie die drei Wörter oben, lesen Sie dann den Satz. Drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.",
      runHintNoPrimes:   "Drücken Sie <strong>Aufnahme starten</strong>, lesen Sie den Satz einmal, drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.",
      startRec:          "Aufnahme starten",
      stopRec:           "Stopp",
      accept:            "Akzeptieren & speichern",
      next:              "Weiter ▶",
      goMic:             "Mikrofon einrichten",
      doneTitle:         "Aufgabe abgeschlossen ✓",
      doneBackMsg:       "Sie müssen noch die andere Aufgabe absolvieren. Klicken Sie unten, um zurückzugehen.",
      doneAllDoneMsg:    "Sie haben beide Aufgaben abgeschlossen. Vielen Dank für Ihre Teilnahme!",
      doneBack:          "Zurück zur Aufgabenauswahl",
      doneFootnote:      "Falls ein Upload fehlgeschlagen ist, wurden die Dateien als lokale Downloads gespeichert.",
      imprintLink:       "Impressum / Imprint",
      overlayUpload:     "Wird hochgeladen… bitte warten",
      overlayWait:       "Schließen Sie diesen Tab nicht.",
      overlaySubmit:     "Fragebogen wird übermittelt…",
      overlayProcess:    "Wird verarbeitet…",
      taskNameA:         "Aufgabe A — Englisches Reimen",
      taskNameB:         "Aufgabe B — Deutsches Reimen",
      taskDescA:         "Sagen Sie drei Reimwörter, nehmen Sie dann den englischen Satz auf.",
      taskDescB:         "Sagen Sie drei Reimwörter, nehmen Sie dann den deutschen Satz auf.",
      instrHtmlA: `
        <p><strong>Aufgabe A — Englisches Reimen:</strong> Für jedes Element:</p>
        <ul>
          <li>Sie sehen <strong>drei englische Wörter</strong>, die sich auf das fehlende Wort reimen.</li>
          <li>Drücken Sie <strong>Aufnahme starten</strong>.</li>
          <li>Sagen Sie in <strong>derselben Aufnahme</strong> zuerst die <strong>drei Wörter</strong>, lesen Sie dann den <strong>Satz</strong> laut vor.</li>
          <li>Das fehlende Wort kann ein Nonsens-Wort sein — das ist beabsichtigt. Bitte sprechen Sie es wie gezeigt aus.</li>
          <li>Drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.</li>
        </ul>`,
      instrHtmlB: `
        <p><strong>Aufgabe B — Deutsches Reimen:</strong> Für jedes Element:</p>
        <ul>
          <li>Sie sehen <strong>drei deutsche Wörter</strong>, die sich auf das fehlende Wort reimen. Der Satz zeigt <strong>H__t</strong> als Hinweis.</li>
          <li>Drücken Sie <strong>Aufnahme starten</strong>.</li>
          <li>Sagen Sie in <strong>derselben Aufnahme</strong> zuerst die <strong>drei Wörter</strong>, lesen Sie dann den <strong>Satz</strong> laut vor.</li>
          <li>Das fehlende Wort kann ein Nonsens-Wort sein — das ist beabsichtigt. Bitte sprechen Sie es wie gezeigt aus.</li>
          <li>Drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.</li>
        </ul>`
    }
  };

  /* ─── consent text ─── */
  const CONSENT_HTML = {
    EN: `
      <p><strong>Thank you very much for participating!</strong><br>
      Please read the following information carefully before you begin.</p>
      <p><strong>About this study:</strong> This recording study is part of ongoing research on phonetic language attrition at the University of Graz — investigating how the sounds of your native language can change when you live in a different language environment. The study is connected to the FWF-funded project <em>"When Your Native Language Sounds Foreign"</em> and contributes to a Master's thesis.</p>
      <p><strong>What you will do:</strong> You will read short sentences aloud and record yourself. The session takes approximately 20 minutes. You will complete two tasks — you may choose the order.</p>
      <p><strong>Before you start (important):</strong></p>
      <ul>
        <li>Please use a laptop or desktop computer (not a phone or tablet).</li>
        <li>Find a quiet room — close windows and silence notifications.</li>
        <li>Sit about 30–50 cm from your microphone and speak clearly at a normal volume.</li>
        <li>For each recording: press <strong>Start recording</strong>, wait one second, speak, wait one second, then press <strong>Stop</strong>.</li>
      </ul>
      <p><strong>Microphone permission:</strong> Your browser will ask for microphone access — please click <strong>Allow</strong>. You can make a test recording before starting. Test recordings are <strong>not saved</strong>.</p>
      <p><strong>Saving recordings:</strong> After each sentence press <strong>Stop</strong> then <strong>Next</strong>. Your recording will upload — this may take a few seconds.</p>
      <p><strong>Data:</strong> Audio recordings will be stored securely and used only for research purposes. Data will be anonymised for publication.</p>
      <p><strong>Voluntary participation:</strong> Participation is voluntary. You may withdraw at any time before submission.</p>
      <p><strong>Contact:</strong> If you have questions or encounter technical problems, please contact the researcher who sent you this link.</p>`,
    DE: `
      <p><strong>Vielen Dank für Ihre Teilnahme!</strong><br>
      Bitte lesen Sie die folgenden Informationen sorgfältig durch, bevor Sie beginnen.</p>
      <p><strong>Zur Studie:</strong> Diese Aufnahme-Studie ist Teil einer laufenden Forschung zur phonetischen Sprachattrition an der Universität Graz. Wir untersuchen, wie sich die Aussprache Ihrer Muttersprache verändern kann, wenn Sie in einer anderen Sprachumgebung leben.</p>
      <p><strong>Was Sie tun werden:</strong> Sie lesen kurze Sätze laut vor und nehmen sich dabei auf. Die Sitzung dauert ca. 20 Minuten. Sie absolvieren zwei Aufgaben — die Reihenfolge ist frei wählbar.</p>
      <p><strong>Wichtige Hinweise vor dem Start:</strong></p>
      <ul>
        <li>Bitte verwenden Sie einen Laptop oder Desktop-Computer (kein Smartphone oder Tablet).</li>
        <li>Suchen Sie einen ruhigen Raum auf — schließen Sie Fenster und schalten Sie Benachrichtigungen stumm.</li>
        <li>Sitzen Sie ca. 30–50 cm vom Mikrofon entfernt und sprechen Sie klar und in normaler Lautstärke.</li>
        <li>Für jede Aufnahme: <strong>Aufnahme starten</strong> drücken, eine Sekunde warten, sprechen, eine Sekunde warten, dann <strong>Stopp</strong> drücken.</li>
      </ul>
      <p><strong>Mikrofonzugriff:</strong> Ihr Browser fragt nach Zugriff auf das Mikrofon — bitte klicken Sie auf <strong>Erlauben</strong>. Sie können vor dem Start eine Testaufnahme machen. Testaufnahmen werden <strong>nicht gespeichert</strong>.</p>
      <p><strong>Aufnahmen speichern:</strong> Nach jedem Satz auf <strong>Akzeptieren &amp; speichern</strong> klicken. Die Aufnahme wird hochgeladen.</p>
      <p><strong>Daten:</strong> Audioaufnahmen werden sicher gespeichert und ausschließlich für Forschungszwecke verwendet. Die Daten werden für Veröffentlichungen anonymisiert.</p>
      <p><strong>Freiwilligkeit:</strong> Die Teilnahme ist freiwillig. Sie können jederzeit vor der Übermittlung zurücktreten.</p>
      <p><strong>Kontakt:</strong> Bei Fragen oder technischen Problemen wenden Sie sich bitte an die Person, die Ihnen diesen Link geschickt hat.</p>`
  };

  /* ═══════════════════════════════════════════
     APPLY UI LANGUAGE
  ═══════════════════════════════════════════ */
  function applyLanguage(group) {
    const t = UI[group];
    document.documentElement.lang = group === "DE" ? "de" : "en";

    // Header
    setText("headerTitle",   t.headerTitle);
    setText("imprintLink",   t.imprintLink);

    // Consent
    setText("consentTitle",    t.consentTitle);
    setHTML("consentText",     CONSENT_HTML[group]);
    setText("consentChkLabel", t.consentChkLabel);
    setText("scrollHintText",  t.scrollHint);
    setText("consentFootnote", t.consentFootnote);
    setAttr("btnConsent",  "textContent", t.consentAgree);
    setAttr("btnDecline",  "textContent", t.consentDecline);

    // Task selection
    setText("taskSelTitle",    t.taskSelTitle);
    setText("taskSelSubtitle", t.taskSelSubtitle);
    setText("taskSelFootnote", t.taskSelFootnote);

    // Instructions
    setText("btnInstrOk",   t.instrOk);
    setText("btnInstrBack", t.instrBack);

    // Mic setup
    setText("micTitle",       t.micTitle);
    setText("micSubtitle",    t.micSubtitle);
    setText("micHint",        t.micHint);
    setText("micFootnote",    t.micFootnote);
    setText("btnInit",        t.micEnable);
    setText("btnBeginTask",   t.micBegin);
    setText("btnBackToTask",  t.micBackToTask);
    setText("btnRefreshMics", t.micRefresh);
    setText("testBoxTitle",   t.testBoxTitle);
    setHTML("testBoxInstr",   t.testBoxInstr);
    setText("testPrompt",     t.testPrompt);
    setText("btnTestStart",   t.testStart);
    setText("btnTestStop",    t.testStop);
    setText("btnTestPlay",    t.testPlay);
    setText("btnTestRedo",    t.testRedo);
    setText("testStatus",     t.testNotRecorded);
    setText("micStatus",      group === "DE" ? "Mikrofon: nicht gestartet" : "Microphone: not started");

    // Recording screen
    setText("primesLabel",  t.primesLabel);
    setText("btnStartRec",  t.startRec);
    setText("btnStopRec",   t.stopRec);
    setText("btnNext",      t.next);
    setText("btnRunGoMic",  t.goMic);

    // Done screen
    setText("doneTitle",      t.doneTitle);
    setText("doneBackMsg",    t.doneBackMsg);
    setText("doneAllDoneMsg", t.doneAllDoneMsg);
    setText("btnDoneBack",    t.doneBack);
    setText("doneFootnote",   t.doneFootnote);

    // Overlay
    setText("overlayTitle", t.overlayUpload);
    setText("overlayMsg",   t.overlayWait);

    // Task grid
    buildTaskGrid(group);
  }

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

  /* ═══════════════════════════════════════════
     TASK GRID (task selection screen)
  ═══════════════════════════════════════════ */
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
      const flags = { A: "🇬🇧", B: "🇦🇹" };
      const flag = flags[def.id] || "";
      card.innerHTML = `<div class="task-flag" aria-hidden="true">${flag}</div><div class="task-name">${name}</div>`;
      grid.appendChild(card);

      card.addEventListener("click", () => { if (!completedTasks.has(key)) pickTask(key); });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!completedTasks.has(key)) pickTask(key); }
      });
    }
  }

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

  /* ═══════════════════════════════════════════
     DOM REFS (screens)
  ═══════════════════════════════════════════ */
  const screens = {
    group:      $("#scr-group"),
    consent:    $("#scr-consent"),
    detailsDE:  $("#scr-details-de"),
    detailsEN:  $("#scr-details-en"),
    q1:         $("#scr-quest-1"),
    q2:         $("#scr-quest-2"),
    q3:         $("#scr-quest-3"),
    q4:         $("#scr-quest-4"),
    q5:         $("#scr-quest-5"),
    q6:         $("#scr-quest-6"),
    q7:         $("#scr-quest-7"),
    q8:         $("#scr-quest-8"),
    taskselect: $("#scr-taskselect"),
    instr:      $("#scr-instr"),
    mic:        $("#scr-mic"),
    run:        $("#scr-run"),
    done:       $("#scr-done")
  };

  /* ═══════════════════════════════════════════
     GROUP SELECTION
  ═══════════════════════════════════════════ */
  function selectGroup(group) {
    selectedGroup = group;
    applyLanguage(group);
    show(screens.consent);
  }

  function handleGroupCardKey(e, group) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectGroup(group); }
  }

  $("#btnGroupEN").addEventListener("click",    () => selectGroup("EN"));
  $("#btnGroupDE").addEventListener("click",    () => selectGroup("DE"));
  $("#btnGroupEN").addEventListener("keydown",  e  => handleGroupCardKey(e, "EN"));
  $("#btnGroupDE").addEventListener("keydown",  e  => handleGroupCardKey(e, "DE"));

  /* ═══════════════════════════════════════════
     CONSENT
  ═══════════════════════════════════════════ */
  const consentChk = $("#consentChk");
  const btnConsent = $("#btnConsent");

  consentChk.addEventListener("change", () => {
    btnConsent.disabled = !consentChk.checked;
  });

  btnConsent.addEventListener("click", () => {
    if (!consentChk.checked) return;
    consentGiven   = true;
    consentTimeIso = new Date().toISOString();
    // Route to correct details screen
    show(selectedGroup === "DE" ? screens.detailsDE : screens.detailsEN);
  });

  $("#btnDecline").addEventListener("click", () => {
    const msg = selectedGroup === "DE"
      ? "Sie haben die Teilnahme abgelehnt. Diese Seite wird jetzt geschlossen."
      : "You chose not to participate. This page will now close.";
    alert(msg);
    try { window.close(); } catch (e) {}
  });

  /* ═══════════════════════════════════════════
     DETAILS — DE GROUP (short form)
  ═══════════════════════════════════════════ */
  const deFields = ["de-pid", "de-birthYear", "de-sex", "de-state", "de-city"];

  function checkDeForm() {
    const ok = deFields.every(id => {
      const el = $(`#${id}`);
      return el && String(el.value || "").trim();
    });
    $("#btnDeDetailsContinue").disabled = !ok;
  }

  deFields.forEach(id => {
    const el = $(`#${id}`);
    if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", checkDeForm);
  });

  $("#btnDeDetailsContinue").addEventListener("click", () => {
    meta.pid        = $("#de-pid").value.trim();
    meta.birthYear  = $("#de-birthYear").value.trim();
    meta.sex        = $("#de-sex").value;
    meta.bundesland = $("#de-state").value;
    meta.city       = $("#de-city").value.trim();
    show(screens.taskselect);
    updateTaskGrid();
  });

  $("#btnDeDetailsBack").addEventListener("click", () => show(screens.consent));

  /* ═══════════════════════════════════════════
     DETAILS — EN GROUP (leads to full questionnaire)
  ═══════════════════════════════════════════ */
  const enFields = ["en-pid", "en-birthYear", "en-sex", "en-state", "en-city"];

  function checkEnForm() {
    const ok = enFields.every(id => {
      const el = $(`#${id}`);
      return el && String(el.value || "").trim();
    });
    $("#btnEnDetailsContinue").disabled = !ok;
  }

  enFields.forEach(id => {
    const el = $(`#${id}`);
    if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", checkEnForm);
  });

  $("#btnEnDetailsContinue").addEventListener("click", () => {
    meta.pid        = $("#en-pid").value.trim();
    meta.birthYear  = $("#en-birthYear").value.trim();
    meta.sex        = $("#en-sex").value;
    meta.bundesland = $("#en-state").value;
    meta.city       = $("#en-city").value.trim();
    // Sync arrival-year computed fields with birth year if available
    computeDerived();
    show(screens.q1);
  });

  $("#btnEnDetailsBack").addEventListener("click", () => show(screens.consent));

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — derived fields
  ═══════════════════════════════════════════ */
  function computeDerived() {
    const currentYear = new Date().getFullYear();
    const birth   = parseInt(meta.birthYear, 10);
    const arrival = parseInt(($('#arrivalYear') || {}).value || "", 10);

    if ($("#derivedAge"))
      $("#derivedAge").value = Number.isFinite(birth) ? String(currentYear - birth) : "";
    if ($("#derivedAgeMigration"))
      $("#derivedAgeMigration").value = (Number.isFinite(birth) && Number.isFinite(arrival)) ? String(arrival - birth) : "";
    if ($("#derivedDuration"))
      $("#derivedDuration").value = Number.isFinite(arrival) ? String(currentYear - arrival) : "";
  }

  $("#arrivalYear")?.addEventListener("input", computeDerived);

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — scale builder
  ═══════════════════════════════════════════ */
  function createScaleBlock(name, label, n, leftLabel, rightLabel) {
    const wrap = document.createElement("div");
    wrap.className = "q-card";

    const legend = document.createElement("fieldset");
    legend.innerHTML = `<legend>${label}</legend>`;

    const row = document.createElement("div");
    row.className = "choice-inline";
    for (let i = 1; i <= n; i++) {
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="radio" name="${name}" value="${i}" /> ${i}`;
      row.appendChild(lab);
    }
    legend.appendChild(row);

    const scaleRow = document.createElement("div");
    scaleRow.className = "row";
    scaleRow.style.justifyContent = "space-between";
    scaleRow.innerHTML = `<span class="scale-label">${leftLabel}</span><span class="scale-label">${rightLabel}</span>`;
    legend.appendChild(scaleRow);

    wrap.appendChild(legend);
    return wrap;
  }

  const PROF_LABELS = [
    ["pronunciation",      "Pronunciation"],
    ["oral_comprehension", "Oral comprehension"],
    ["writing",            "Writing"],
    ["fluency",            "Fluency"],
    ["reading",            "Reading"]
  ];

  const GENERAL_SCALES = [
    ["speakGermanOften",    "How often do you speak German?",                                                "1 = very little",   "5 = very often"],
    ["maintainEnglish",     "Do you consider it important to maintain your English?",                        "1 = not important", "5 = very important"],
    ["passNativeLanguage",  "Would you consider it important to pass on your native language to the next generation?", "1 = not important", "5 = very important"],
    ["friendsGermanEnglish","In general, do you have more German- or English-speaking friends in Austria?", "1 = more English",  "5 = more German"],
    ["homeCulture",         "Do you feel more at home with Austrian or with British culture?",               "1 = more British",  "5 = more Austrian"]
  ];

  const DOMAIN_ITEMS = [
    ["household",        "With household members"],
    ["relatives_outside","With relatives outside of the household"],
    ["friends_outside",  "With friends outside of the household"],
    ["neighbours",       "With neighbours"],
    ["work",             "At work"],
    ["school_uni",       "At school / university"],
    ["public_services",  "For public services"],
    ["shops_services",   "In shops or to contract services"],
    ["leisure",          "For leisure activities"]
  ];

  const MEDIA_SCALES = [
    ["moreLessEnglish", "Do you think you use more or less English since you moved to Austria?",        "1 = less English", "5 = more English"],
    ["futureAustriaUK", "Would you like to move back to the UK or stay in Austria in the future?",      "1 = UK",           "5 = Austria"]
  ];

  function buildQuestionnaireUI() {
    const profBeforeWrap = $("#profBeforeWrap");
    const profNowWrap    = $("#profNowWrap");
    if (profBeforeWrap && profNowWrap) {
      PROF_LABELS.forEach(([key, label]) => {
        profBeforeWrap.appendChild(createScaleBlock(`prof_before_${key}`, label, 10, "1 = very low", "10 = very high"));
        profNowWrap.appendChild(createScaleBlock(`prof_now_${key}`,    label, 10, "1 = very low", "10 = very high"));
      });
    }

    const generalWrap = $("#generalScalesWrap");
    if (generalWrap) {
      GENERAL_SCALES.forEach(([key, label, left, right]) => {
        generalWrap.appendChild(createScaleBlock(key, label, 5, left, right));
      });
    }

    const germanWrap  = $("#germanDomainsWrap");
    const englishWrap = $("#englishDomainsWrap");
    if (germanWrap && englishWrap) {
      DOMAIN_ITEMS.forEach(([key, label]) => {
        germanWrap.appendChild(createScaleBlock(`german_domain_${key}`,  label, 5, "1 = very little", "5 = very often"));
        englishWrap.appendChild(createScaleBlock(`english_domain_${key}`, label, 5, "1 = very little", "5 = very often"));
      });
    }

    const mediaWrap = $("#mediaScalesWrap");
    if (mediaWrap) {
      MEDIA_SCALES.forEach(([key, label, left, right]) => {
        mediaWrap.appendChild(createScaleBlock(key, label, 5, left, right));
      });
    }
  }

  buildQuestionnaireUI();

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — conditional logic
  ═══════════════════════════════════════════ */
  function setupConditionalLogic() {
    const wire = (names, handler) => {
      (Array.isArray(names) ? names : [names]).forEach(name => {
        $$(`input[name="${name}"]`).forEach(el => el.addEventListener("change", handler));
      });
    };
    const wireChk = (id, handler) => $(`#${id}`)?.addEventListener("change", handler);
    const wireSel = (id, handler) => $(`#${id}`)?.addEventListener("change", handler);

    wire("livedAbroad",          () => toggleHidden("#livedAbroadDetails",    getRadio("livedAbroad")          === "1"));
    wireChk("prePrimaryOtherChk", () => toggleHidden("#prePrimaryOtherWrap",  $("#prePrimaryOtherChk")?.checked));
    wire("germanBefore",          () => toggleHidden("#germanBeforeDetails",   getRadio("germanBefore")          === "1"));
    wire("germanAustria",         () => toggleHidden("#germanAustriaDetails",  getRadio("germanAustria")          === "1"));
    wire("expatCommunity",        () => toggleHidden("#expatDetails",          getRadio("expatCommunity")          === "1"));
    wire("backToUK",              () => toggleHidden("#backToUKDetails",       getRadio("backToUK")               === "1"));
    wireChk("hhSpeakEnglishChk",  () => toggleHidden("#hhEnglishVarietyWrap", $("#hhSpeakEnglishChk")?.checked));
    wireChk("hhSpeakGermanChk",   () => toggleHidden("#hhGermanVarietyWrap",  $("#hhSpeakGermanChk")?.checked));
    wireChk("hhSpeakOtherChk",    () => toggleHidden("#hhOtherSpeakWrap",     $("#hhSpeakOtherChk")?.checked));
    wireSel("hhYouToThem", () => {
      toggleHidden("#hhYouToThemOtherWrap",  $("#hhYouToThem")?.value === "Other");
      toggleHidden("#hhYouToThemGermanWrap", $("#hhYouToThem")?.value === "German");
    });
    wireSel("hhThemToYou", () => {
      toggleHidden("#hhThemToYouOtherWrap",   $("#hhThemToYou")?.value === "Other");
      toggleHidden("#hhThemToYouEnglishWrap", $("#hhThemToYou")?.value === "English");
      toggleHidden("#hhThemToYouGermanWrap",  $("#hhThemToYou")?.value === "German");
    });
    wire("hasChildren",          () => toggleHidden("#childrenDetails",       getRadio("hasChildren")           === "1"));
    wire("childOtherNames",      () => toggleHidden("#childOtherNamesWrap",   getRadio("childOtherNames")       === "1"));
    wireSel("ukContactLanguage",  () => toggleHidden("#ukContactLanguageOtherWrap", $("#ukContactLanguage")?.value === "Other"));
    wire("othersCommentEnglish", () => toggleHidden("#othersCommentDetails",  getRadio("othersCommentEnglish")  === "1"));
    wire("englishChanged",       () => toggleHidden("#englishChangedDetails", getRadio("englishChanged")        === "1"));
  }

  setupConditionalLogic();

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — required-field validation
     Scans the currently visible screen for every radio
     group (by name) and checkbox group (by shared name)
     and requires at least one option checked in each,
     but only for groups that are currently visible
     (skips groups hidden inside a collapsed conditional block).
  ═══════════════════════════════════════════ */
  function validateVisibleScreen(screenEl) {
    if (!screenEl) return true;

    const radios = Array.from(screenEl.querySelectorAll('input[type="radio"]'));
    const radioNames = new Set(radios.map(el => el.name).filter(Boolean));
    for (const name of radioNames) {
      const inputs = radios.filter(el => el.name === name);
      const anyVisible = inputs.some(el => el.offsetParent !== null);
      if (!anyVisible) continue; // whole group hidden — not applicable right now
      const answered = inputs.some(el => el.checked);
      if (!answered) return false;
    }

    const checkboxes = Array.from(screenEl.querySelectorAll('input[type="checkbox"][name]'));
    const checkboxNames = new Set(checkboxes.map(el => el.name).filter(Boolean));
    for (const name of checkboxNames) {
      const inputs = checkboxes.filter(el => el.name === name);
      const anyVisible = inputs.some(el => el.offsetParent !== null);
      if (!anyVisible) continue;
      const answered = inputs.some(el => el.checked);
      if (!answered) return false;
    }

    return true;
  }

  function showValidationAlert() {
    alert(selectedGroup === "DE"
      ? "Bitte beantworten Sie alle Fragen auf dieser Seite, bevor Sie fortfahren."
      : "Please answer all questions on this page before continuing.");
  }

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — navigation
  ═══════════════════════════════════════════ */
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

  $("#btnQ1Next").addEventListener("click", () => qNavGuarded("q1", "q2"));
  $("#btnQ1Back").addEventListener("click", () => qNav("detailsEN"));
  $("#btnQ2Next").addEventListener("click", () => qNavGuarded("q2", "q3"));
  $("#btnQ2Back").addEventListener("click", () => qNav("q1"));
  $("#btnQ3Next").addEventListener("click", () => qNavGuarded("q3", "q4"));
  $("#btnQ3Back").addEventListener("click", () => qNav("q2"));
  $("#btnQ4Next").addEventListener("click", () => qNavGuarded("q4", "q5"));
  $("#btnQ4Back").addEventListener("click", () => qNav("q3"));
  $("#btnQ5Next").addEventListener("click", () => qNavGuarded("q5", "q6"));
  $("#btnQ5Back").addEventListener("click", () => qNav("q4"));
  $("#btnQ6Next").addEventListener("click", () => qNavGuarded("q6", "q7"));
  $("#btnQ6Back").addEventListener("click", () => qNav("q5"));
  $("#btnQ7Next").addEventListener("click", () => qNavGuarded("q7", "q8"));
  $("#btnQ7Back").addEventListener("click", () => qNav("q6"));
  $("#btnQ8Back").addEventListener("click", () => qNav("q7"));


  /* ─── collect & upload questionnaire ─── */
  function valueOf(id) { return ($(`#${id}`)?.value || ""); }
  function checked01(id) { return $(`#${id}`)?.checked ? "1" : "0"; }
  function checkboxList(name) { return $$(`input[name="${name}"]:checked`).map(el => el.value).join("|"); }

  function collectQuestionnaireData() {
    computeDerived();
    const data = {
      participant_id:  meta.pid,
      bundesland:      meta.bundesland,
      city:            meta.city,
      sex:             meta.sex,
      year_of_birth:   meta.birthYear,
      year_arrival_austria: valueOf("arrivalYear"),
      age:             valueOf("derivedAge"),
      age_at_migration: valueOf("derivedAgeMigration"),
      duration_living_austria: valueOf("derivedDuration"),
      lived_other_country_longer_6m: getRadio("livedAbroad"),
      lived_other_country_years: valueOf("abroadYears"),
      lived_other_country_name:  valueOf("abroadCountry"),
      lived_other_country_from:  valueOf("abroadFrom"),
      lived_other_country_to:    valueOf("abroadTo"),
      languages_before_primary_school: checkboxList("prePrimaryLang"),
      languages_before_primary_school_other: valueOf("prePrimaryOther"),
      german_classes_before_austria: getRadio("germanBefore"),
      german_before_variety:    valueOf("germanBeforeVariety"),
      german_before_last_year:  valueOf("germanBeforeLastYear"),
      german_classes_in_austria: getRadio("germanAustria"),
      german_in_austria_variety:    valueOf("germanAustriaVariety"),
      german_in_austria_last_year:  valueOf("germanAustriaLastYear"),
      expat_community:   getRadio("expatCommunity"),
      expat_since_year:  valueOf("expatSinceYear"),
      back_to_uk_since_leaving: getRadio("backToUK"),
      back_to_uk_avg_duration:  valueOf("ukStayDuration"),
      household_languages_spoken_english: checked01("hhSpeakEnglishChk"),
      household_languages_spoken_german:  checked01("hhSpeakGermanChk"),
      household_languages_spoken_other:   checked01("hhSpeakOtherChk"),
      household_languages_spoken_other_text: valueOf("hhOtherSpeak"),
      household_english_variety: valueOf("hhEnglishVariety"),
      household_german_variety:  valueOf("hhGermanVariety"),
      you_to_household_language: valueOf("hhYouToThem"),
      you_to_household_other:    valueOf("hhYouToThemOther"),
      you_to_household_german_variety: valueOf("hhYouToThemGermanVariety"),
      household_to_you_language: valueOf("hhThemToYou"),
      household_to_you_other:    valueOf("hhThemToYouOther"),
      household_to_you_english_variety: valueOf("hhThemToYouEnglishVariety"),
      household_to_you_german_variety:  valueOf("hhThemToYouGermanVariety"),
      has_children:           getRadio("hasChildren"),
      children_english_names: getRadio("childEnglishNames"),
      children_german_names:  getRadio("childGermanNames"),
      children_other_names:   getRadio("childOtherNames"),
      children_other_names_text: valueOf("childOtherNamesText"),
      uk_contact_frequency:  getRadio("ukContactFreq"),
      uk_contact_language:   valueOf("ukContactLanguage"),
      uk_contact_language_other: valueOf("ukContactLanguageOther"),
      uk_contact_method:     valueOf("ukContactMethod"),
      watch_british_tv:          getRadio("watchBritishTV"),
      listen_british_radio:      getRadio("listenBritishRadio"),
      read_british_media:        getRadio("readBritishMedia"),
      listen_austrian_radio:     getRadio("listenAustrianRadio"),
      others_comment_english:    getRadio("othersCommentEnglish"),
      others_comment_accent:     checked01("commentAccent"),
      others_comment_sounds:     checked01("commentSounds"),
      others_comment_words:      checked01("commentWords"),
      others_comment_word_order: checked01("commentWordOrder"),
      others_comment_pitch:      checked01("commentPitch"),
      others_comment_grammar:    checked01("commentGrammar"),
      english_changed:           getRadio("englishChanged"),
      english_changed_accent:    checked01("changedAccent"),
      english_changed_sounds:    checked01("changedSounds"),
      english_changed_words:     checked01("changedWords"),
      english_changed_word_order:checked01("changedWordOrder"),
      english_changed_pitch:     checked01("changedPitch"),
      english_changed_grammar:   checked01("changedGrammar"),
      final_comment:             valueOf("finalComment")
    };

    PROF_LABELS.forEach(([key]) => {
      data[`prof_before_${key}`] = getRadio(`prof_before_${key}`);
      data[`prof_now_${key}`]    = getRadio(`prof_now_${key}`);
    });
    GENERAL_SCALES.forEach(([key]) => data[key] = getRadio(key));
    DOMAIN_ITEMS.forEach(([key]) => {
      data[`german_domain_${key}`]  = getRadio(`german_domain_${key}`);
      data[`english_domain_${key}`] = getRadio(`english_domain_${key}`);
    });
    MEDIA_SCALES.forEach(([key]) => data[key] = getRadio(key));

    return data;
  }

  function buildCsvBlob(data) {
    const header = Object.keys(data);
    const row    = header.map(k => data[k]);
    return new Blob([[header.join(","), row.map(csvEscape).join(",")].join("\n")], { type: "text/csv" });
  }

  $("#btnQuestionnaireDone").addEventListener("click", async () => {
    if (!validateVisibleScreen(screens.q8)) {
      showValidationAlert();
      return;
    }
    const btn = $("#btnQuestionnaireDone");
    btn.disabled = true;
    setOverlay(true, UI[selectedGroup].overlaySubmit, UI[selectedGroup].overlayWait);
    try {
      const qData = collectQuestionnaireData();
      const qBlob = buildCsvBlob(qData);
      const qName = `${meta.pid}__QUESTIONNAIRE__${isoSafeNow()}__S${sessionId}.csv`;
      await uploadBlob(qBlob, qName, meta.pid, "QUESTIONNAIRE", "questionnaire");
      questionnaireUploaded = true;
      show(screens.taskselect);
      updateTaskGrid();
    } catch (e) {
      console.error(e);
      alert(selectedGroup === "DE"
        ? "Der Fragebogen konnte nicht übermittelt werden. Bitte versuchen Sie es erneut."
        : "The questionnaire could not be submitted. Please try again.");
    } finally {
      setOverlay(false);
      btn.disabled = false;
    }
  });

  /* ═══════════════════════════════════════════
     FIREBASE — init
  ═══════════════════════════════════════════ */
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDrO7iy2Ajl0O5qxEACyTB-kP-P21jIWB4",
    authDomain:        "webdesign-a3cfe.firebaseapp.com",
    projectId:         "webdesign-a3cfe",
    storageBucket:     "webdesign-a3cfe.firebasestorage.app",
    messagingSenderId: "506925061339",
    appId:             "1:506925061339:web:fed856b63f7df2dfd3e8fe"
  };

  // Firebase is loaded via CDN scripts in index.html before app.js
  const firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  const db          = firebase.firestore();

  /* ═══════════════════════════════════════════
     UPLOAD — Firestore
     WAV files  → "recordings" collection (base64-encoded)
     CSV files  → "sessions" collection (plain text)
  ═══════════════════════════════════════════ */
  async function uploadBlob(blob, filename, pid, taskId, itemLabel) {
    // Convert blob to base64 string
    const base64 = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload  = () => res(String(fr.result).split(",")[1]);
      fr.readAsDataURL(blob);
    });

    const isWav = blob.type === "audio/wav" || filename.endsWith(".wav");
    const collection = isWav ? "recordings" : "sessions";

    const doc = {
      filename,
      pid,
      session_id:   sessionId,
      task_id:      taskId,
      item_label:   itemLabel || `${taskId} item ${String(itemIdx + 1).padStart(2, "0")}`,
      group:        selectedGroup,
      mime:         blob.type || "application/octet-stream",
      data_base64:  base64,
      uploaded_at:  firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(collection).add(doc);
  }

  const overlay      = $("#overlay");
  const overlayTitle = $("#overlayTitle");
  const overlayMsg   = $("#overlayMsg");

  function setOverlay(on, title, msg) {
    overlayTitle.textContent = title || "";
    overlayMsg.textContent   = msg   || "";
    overlay.classList.toggle("active", !!on);
  }

  /* ═══════════════════════════════════════════
     TASK SELECTION & INSTRUCTIONS
  ═══════════════════════════════════════════ */
  function pickTask(taskKey) {
    if (completedTasks.has(taskKey)) return;
    selectedTaskId = taskKey;
    const def = builtTasks[taskKey];
    taskItems  = def ? def.items.slice() : [];
    itemIdx    = 0;
    currentItem = null;

    const t    = UI[selectedGroup];
    const name = t[`taskName${def.id}`] || def.name_en;
    const html = t[`instrHtml${def.id}`] || "<p>Instructions not available.</p>";

    $("#instrTitle").textContent = name;
    $("#instrBody").innerHTML    = html;
    show(screens.instr);
  }

  $("#btnInstrOk").addEventListener("click",   () => show(screens.mic));
  $("#btnInstrBack").addEventListener("click",  () => show(screens.taskselect));

  /* ═══════════════════════════════════════════
     AUDIO / MIC
  ═══════════════════════════════════════════ */
  let micReady        = false;
  let audioCtx        = null, stream = null, source = null, workletNode = null, zeroGain = null;
  let selectedDeviceId = "";
  let workletModuleUrl = null;
  let testObjUrl       = null;

  let recording      = false;
  let recBuffers     = [], totalLength = 0, sampleRate = 48000;
  let lastBlob       = null, lastDuration = 0, lastRecPeak = 0;
  let recPeak        = 0, testPeak = 0;
  let recTimer       = null, testTimer = null;
  let recStartMs     = 0,   testStartMs = 0;

  let testRecording  = false;
  let testBuffers    = [], testTotalLength = 0;
  let testBlob       = null, testReady = false;

  const micStatusEl = $("#micStatus");
  const micLevelEl  = $("#micLevel");
  const micSrEl     = $("#micSr");
  const testStatusEl = $("#testStatus");
  const testPlayer   = new Audio();
  const micSel       = $("#micSel");
  const testBox      = $("#testBox");

  function setMicStatus(t) { if (micStatusEl) micStatusEl.textContent = t; }
  function setTestStatus(t) { if (testStatusEl) testStatusEl.textContent = t; }

  function computeLevel(input) {
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const db = 20 * Math.log10(Math.sqrt(sum / input.length) + 1e-12);
    if (micLevelEl) micLevelEl.textContent = `Level: ${db.toFixed(1)} dBFS`;
  }

  function updatePeak(arr, isTest) {
    let peak = 0;
    for (let i = 0; i < arr.length; i++) { const a = Math.abs(arr[i]); if (a > peak) peak = a; }
    if (isTest) testPeak = Math.max(testPeak, peak);
    else        recPeak  = Math.max(recPeak,  peak);
  }

  function floatTo16BitPCM(view, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
    }
  }

  function writeWavHeader(view, sr, nCh, nFrames) {
    const wr = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    const bps = 2, ba = nCh * bps, br = sr * ba;
    wr(view, 0, "RIFF"); view.setUint32(4, 36 + nFrames * ba, true);
    wr(view, 8, "WAVE"); wr(view, 12, "fmt "); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, nCh, true);
    view.setUint32(24, sr, true); view.setUint32(28, br, true);
    view.setUint16(32, ba, true); view.setUint16(34, 16, true);
    wr(view, 36, "data"); view.setUint32(40, nFrames * ba, true);
  }

  function encodeWavFromBuffers(buffers, totalLen) {
    const mono = new Float32Array(totalLen);
    let off = 0;
    for (const b of buffers) { mono.set(b, off); off += b.length; }
    const buf  = new ArrayBuffer(44 + mono.length * 2);
    const view = new DataView(buf);
    writeWavHeader(view, sampleRate, 1, mono.length);
    floatTo16BitPCM(view, 44, mono);
    return new Blob([view], { type: "audio/wav" });
  }

  function encodeWav() { return encodeWavFromBuffers(recBuffers, totalLength); }

  function resetTestUI() {
    testRecording = false; testBuffers = []; testTotalLength = 0;
    testBlob = null; testReady = false; testPeak = 0;
    if (testTimer) { clearInterval(testTimer); testTimer = null; }
    if (testObjUrl) { try { URL.revokeObjectURL(testObjUrl); } catch (e) {} testObjUrl = null; }
    setTestStatus(UI[selectedGroup]?.testNotRecorded || "Not recorded");
    $("#btnTestStart").disabled = !micReady;
    $("#btnTestStop").disabled  = true;
    $("#btnTestPlay").disabled  = true;
    $("#btnTestRedo").disabled  = true;
    testPlayer.src = "";
    $("#btnBeginTask").disabled = true;
    $("#btnBackToTask").style.display = returnToRunAfterMic ? "inline-block" : "none";
  }

  function cleanupAudioOnFailure() {
    try { stream?.getTracks().forEach(t => t.stop()); } catch (e) {}
    stream = null;
    try { if (audioCtx?.state !== "closed") audioCtx?.close(); } catch (e) {}
    audioCtx = null; source = null; workletNode = null; zeroGain = null;
    if (workletModuleUrl) { try { URL.revokeObjectURL(workletModuleUrl); } catch (e) {} workletModuleUrl = null; }
    micReady = false;
    if (micSel) { micSel.innerHTML = `<option value="">Enable microphone to list devices…</option>`; micSel.disabled = true; }
    $("#btnRefreshMics").disabled = true;
  }

  async function populateMicList() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    let devices = [];
    try { devices = await navigator.mediaDevices.enumerateDevices(); } catch (e) { return; }
    const inputs = devices.filter(d => d.kind === "audioinput");
    micSel.innerHTML = "";
    if (!inputs.length) {
      micSel.innerHTML = `<option value="">No microphone devices found</option>`;
      micSel.disabled = true; return;
    }
    inputs.forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId; opt.textContent = d.label || `Microphone ${idx + 1}`;
      micSel.appendChild(opt);
    });
    try {
      const track    = stream?.getAudioTracks?.()[0];
      const settings = track?.getSettings?.() || {};
      const currentId = settings.deviceId || selectedDeviceId || "";
      if (currentId) { micSel.value = currentId; selectedDeviceId = micSel.value || selectedDeviceId; }
      else selectedDeviceId = micSel.value;
    } catch (e) { selectedDeviceId = micSel.value; }
    micSel.disabled = false;
    $("#btnRefreshMics").disabled = false;
  }

  async function switchMic(deviceId) {
    if (!deviceId || !navigator.mediaDevices?.getUserMedia) return;
    if (!audioCtx || !workletNode) return;
    if (testRecording) { alert("Please stop the test first."); return; }
    if (recording)     { alert("Please stop the recording first."); return; }
    resetTestUI();
    setMicStatus("mic: switching…");
    try { stream?.getTracks().forEach(t => t.stop()); } catch (e) {}
    stream = null;
    try { source?.disconnect(); } catch (e) {}
    source = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 },
                 noiseSuppression: false, echoCancellation: false, autoGainControl: false }
      });
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(workletNode);
      selectedDeviceId = deviceId;
      setMicStatus(selectedGroup === "DE" ? "Mikrofon: bereit" : "mic: ready");
      micReady = true;
      testBox.style.display = "block";
      resetTestUI();
      await populateMicList();
    } catch (e) {
      console.error(e);
      setMicStatus("mic: error");
      alert(selectedGroup === "DE"
        ? "Mikrofon konnte nicht gewechselt werden. Bitte ein anderes Gerät wählen oder die Seite neu laden."
        : "Switching microphone failed. Please try a different device or reload the page.");
      cleanupAudioOnFailure();
      $("#btnInit").disabled = false;
    }
  }

  async function initMic() {
    if (micReady) return;
    $("#btnInit").disabled = true;
    setMicStatus(selectedGroup === "DE" ? "Mikrofon wird gestartet…" : "mic: starting…");
    try {
      const constraints = {
        channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 },
        noiseSuppression: false, echoCancellation: false, autoGainControl: false
      };
      if (selectedDeviceId) constraints.deviceId = { exact: selectedDeviceId };

      stream   = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      try { await audioCtx.resume(); } catch (e) {}
      sampleRate = audioCtx.sampleRate;
      if (micSrEl) micSrEl.textContent = `sr: ${sampleRate} Hz`;

      source = audioCtx.createMediaStreamSource(stream);

      const workletCode = `
        class P extends AudioWorkletProcessor {
          process(inputs) {
            const ch = inputs[0];
            if (!ch || !ch.length) return true;
            const n = ch[0].length, mono = new Float32Array(n);
            for (let c = 0; c < ch.length; c++) {
              if (ch[c]) for (let i = 0; i < n; i++) mono[i] += ch[c][i] / ch.length;
            }
            this.port.postMessage(mono);
            return true;
          }
        }
        registerProcessor('rec-p', P);`;

      workletModuleUrl = URL.createObjectURL(new Blob([workletCode], { type: "application/javascript" }));
      try { await audioCtx.audioWorklet.addModule(workletModuleUrl); }
      finally { try { URL.revokeObjectURL(workletModuleUrl); } catch (e) {} workletModuleUrl = null; }

      workletNode = new AudioWorkletNode(audioCtx, "rec-p");
      zeroGain    = audioCtx.createGain(); zeroGain.gain.value = 0;
      source.connect(workletNode); workletNode.connect(zeroGain); zeroGain.connect(audioCtx.destination);

      workletNode.port.onmessage = (e) => {
        const d = e.data;
        if (testRecording) updatePeak(d, true);
        if (recording)     updatePeak(d, false);
        if (testRecording) {
          const c = new Float32Array(d.length); c.set(d);
          testBuffers.push(c); testTotalLength += c.length; computeLevel(c); return;
        }
        if (recording) {
          const c = new Float32Array(d.length); c.set(d);
          recBuffers.push(c); totalLength += c.length; computeLevel(c); return;
        }
        computeLevel(d);
      };

      setMicStatus(selectedGroup === "DE" ? "Mikrofon: bereit" : "mic: ready");
      micReady = true;
      await populateMicList();
      testBox.style.display = "block";
      resetTestUI();
    } catch (e) {
      console.error(e);
      cleanupAudioOnFailure();
      setMicStatus("mic: error");
      alert(selectedGroup === "DE"
        ? "Mikrofon-Initialisierung fehlgeschlagen.\n\nBitte verwenden Sie Chrome/Edge, laden Sie die Seite neu und stellen Sie sicher, dass der Mikrofonzugriff erlaubt ist."
        : "Microphone initialisation failed.\n\nPlease use Chrome/Edge, reload the page, and make sure microphone permissions are allowed.");
      $("#btnInit").disabled = false;
      return;
    }
    $("#btnInit").disabled = true;
  }

  $("#btnInit").addEventListener("click", initMic);
  $("#btnRefreshMics").addEventListener("click", () => populateMicList());
  micSel.addEventListener("change", () => {
    const id = micSel.value;
    if (!id) return;
    selectedDeviceId = id;
    if (micReady) switchMic(id);
  });

  /* ─── test recording ─── */
  function startTest() {
    if (!micReady || !audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    if (recording) { alert("Please finish the current recording first."); return; }
    testRecording = true; testBuffers = []; testTotalLength = 0; testBlob = null; testReady = false; testPeak = 0;
    setTestStatus(selectedGroup === "DE" ? "Test: läuft…" : "test: recording…");
    $("#btnTestStart").disabled = true; $("#btnTestStop").disabled = false;
    $("#btnTestPlay").disabled  = true; $("#btnTestRedo").disabled  = true;
    testPlayer.src = "";
    $("#btnBeginTask").disabled = true;
    testStartMs = Date.now();
    testTimer = setInterval(() => { if (testRecording && Date.now() - testStartMs >= MAX_REC_SECONDS * 1000) stopTest(); }, 250);
  }

  function stopTest() {
    if (!testRecording) return;
    testRecording = false;
    if (testTimer) { clearInterval(testTimer); testTimer = null; }
    if (testPeak < SILENCE_PEAK_THRESHOLD) {
      setTestStatus(selectedGroup === "DE" ? "Test: kein Ton erkannt ⚠" : "test: no audio detected ⚠");
      alert(selectedGroup === "DE"
        ? "In der Testaufnahme wurde kein Ton erkannt.\n\nBitte wählen Sie ein anderes Mikrofon oder überprüfen Sie Ihre Einstellungen."
        : "No audio detected in the test.\n\nPlease select a different microphone device and try again.");
      resetTestUI(); return;
    }
    testBlob  = encodeWavFromBuffers(testBuffers, testTotalLength);
    testReady = true;
    setTestStatus(selectedGroup === "DE" ? "Test: bereit" : "test: ready (play or redo)");
    $("#btnTestStop").disabled = true; $("#btnTestStart").disabled = true;
    $("#btnTestPlay").disabled = false; $("#btnTestRedo").disabled = false;
    if (testObjUrl) { try { URL.revokeObjectURL(testObjUrl); } catch (e) {} }
    testObjUrl = URL.createObjectURL(testBlob);
    testPlayer.src = testObjUrl;
    $("#btnBeginTask").disabled = false;
  }

  $("#btnTestStart").addEventListener("click", startTest);
  $("#btnTestStop").addEventListener("click",  stopTest);
  $("#btnTestPlay").addEventListener("click",  () => { if (testReady) testPlayer.play().catch(() => {}); });
  $("#btnTestRedo").addEventListener("click",  () => resetTestUI());

  /* ─── go-to-mic / back-to-task ─── */
  $("#btnRunGoMic").addEventListener("click", () => {
    if (recording)     { alert("Please stop the recording first."); return; }
    if (testRecording) { alert("Please stop the test recording first."); return; }
    returnToRunAfterMic = true;
    resetTestUI();
    $("#btnBackToTask").style.display = "inline-block";
    show(screens.mic);
  });

  $("#btnBackToTask").addEventListener("click", () => {
    if (!micReady)  { alert(selectedGroup === "DE" ? "Bitte zuerst Mikrofon aktivieren." : "Please enable the microphone first."); return; }
    if (!testReady) { alert(selectedGroup === "DE" ? "Bitte zuerst Testaufnahme abschließen." : "Please complete the test recording first."); return; }
    $("#btnBackToTask").style.display = "none";
    returnToRunAfterMic = false;
    show(screens.run);
    renderCurrentItem();
  });

  $("#btnBeginTask").addEventListener("click", () => {
    if (!micReady || !audioCtx || !stream) { alert(selectedGroup === "DE" ? "Bitte zuerst Mikrofon aktivieren." : "Please enable the microphone first."); return; }
    if (!testReady) { alert(selectedGroup === "DE" ? "Bitte zuerst Testaufnahme abschließen." : "Please complete the test recording first."); return; }
    if (returnToRunAfterMic) {
      $("#btnBackToTask").style.display = "none";
      returnToRunAfterMic = false;
      show(screens.run); renderCurrentItem(); return;
    }
    startTaskRun();
  });

  /* ═══════════════════════════════════════════
     RUN TASK
  ═══════════════════════════════════════════ */
  const sessionRows = [];
  const CSV_HEADER  = [
    "session_id","session_start_iso","participant_id","group","task","lang","condition",
    "target_token","item_index","prompt_text","primes","filename_wav","accepted_at_iso",
    "duration_seconds","sample_rate_hz"
  ];
  const takeCounters = Object.create(null);

  function nextTakeNumber(pid, targetToken, lang, cond) {
    const key = `${pid}__${targetToken}__${lang}__${cond}`;
    const n   = (takeCounters[key] || 0) + 1;
    takeCounters[key] = n;
    return String(n).padStart(2, "0");
  }

  function buildWavName(item) {
    const tok  = sanitizeToken(item.targetToken || "unknown");
    const take = nextTakeNumber(meta.pid, tok, item.lang, item.condition);
    return `${meta.pid}_${tok}_${item.lang}_${item.condition}_${take}.wav`;
  }

  function buildSessionCsvBlob() {
    return new Blob(
      [[CSV_HEADER.join(","), ...sessionRows.map(r => r.map(csvEscape).join(","))].join("\n")],
      { type: "text/csv" }
    );
  }

  function renderCurrentItem() {
    const def = builtTasks[selectedTaskId];
    const t   = UI[selectedGroup];
    const N   = taskItems.length || 0;

    $("#runTaskLabel").textContent = def ? (t[`taskName${def.id}`] || def.name_en) : `Task ${selectedTaskId}`;
    $("#runProgress").textContent  = `${selectedGroup === "DE" ? "Element" : "Item"} ${Math.min(itemIdx + 1, Math.max(N, 1))} / ${Math.max(N, 1)}`;
    currentItem = taskItems[itemIdx] || null;

    const primesBox   = $("#primesBox");
    const primesWords = $("#primesWords");

    if (currentItem?.primes?.length) {
      primesBox.style.display = "block";
      primesWords.innerHTML   = "";
      currentItem.primes.forEach(w => {
        const span = document.createElement("span");
        span.className = "prime-word"; span.textContent = w;
        primesWords.appendChild(span);
      });
      $("#runGroupTitle").textContent = selectedGroup === "DE" ? "Sagen Sie diese drei Wörter und dann den Satz (in einer Aufnahme):" : "Say the 3 words and then the sentence (in one recording):";
      $("#runHint").innerHTML = t.runHintPrimes;
    } else {
      primesBox.style.display = "none";
      primesWords.innerHTML   = "";
      $("#runGroupTitle").textContent = selectedGroup === "DE" ? "Lesen Sie den Satz laut vor:" : "Read the sentence aloud:";
      $("#runHint").innerHTML = t.runHintNoPrimes;
    }

    $("#promptDisplay").textContent = currentItem ? currentItem.promptText : "—";
    $("#runStatus").textContent     = selectedGroup === "DE" ? "bereit" : "idle";

    recording = false; recBuffers = []; totalLength = 0;
    lastBlob = null; lastDuration = 0; recPeak = 0; lastRecPeak = 0;
    if (recTimer) { clearInterval(recTimer); recTimer = null; }

    $("#btnStartRec").disabled = N === 0;
    $("#btnStopRec").disabled  = true;
    $("#btnNext").disabled     = true;
  }

  function startTaskRun() {
    if (!builtTasks[selectedTaskId]) { alert("Task not found."); show(screens.taskselect); return; }
    show(screens.run);
    renderCurrentItem();
  }

  function startRecording() {
    if (recording || !audioCtx) return;
    if (testRecording) { alert("Please stop the test recording first."); return; }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    recBuffers = []; totalLength = 0; lastBlob = null; lastDuration = 0; recPeak = 0;
    recording = true;
    $("#runStatus").textContent = selectedGroup === "DE" ? "läuft…" : "recording…";
    $("#btnStartRec").disabled = true; $("#btnStopRec").disabled = false;
    $("#btnNext").disabled    = true;
    recStartMs = Date.now();
    recTimer   = setInterval(() => { if (recording && Date.now() - recStartMs >= MAX_REC_SECONDS * 1000) stopRecording(); }, 250);
  }

  function stopRecording() {
    if (!recording) return;
    recording = false;
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    if (recPeak < SILENCE_PEAK_THRESHOLD) {
      $("#runStatus").textContent = selectedGroup === "DE" ? "kein Ton erkannt ⚠" : "no audio detected ⚠";
      alert(selectedGroup === "DE"
        ? "In dieser Aufnahme wurde kein Ton erkannt.\n\nBitte überprüfen Sie Ihr Mikrofon und versuchen Sie es erneut."
        : "No audio detected in this recording.\n\nPlease check your microphone and record again.");
      lastBlob = null; lastDuration = 0;
      $("#btnStopRec").disabled = true; $("#btnNext").disabled = true; $("#btnStartRec").disabled = false;
      return;
    }
    lastBlob     = encodeWav();
    lastDuration = totalLength / sampleRate;
    lastRecPeak  = recPeak;
    $("#runStatus").textContent = selectedGroup === "DE" ? "gestoppt" : "stopped";
    $("#btnStopRec").disabled = true; $("#btnNext").disabled = false;
  }

  async function acceptAndSave() {
    if (!lastBlob || !currentItem) {
      alert(selectedGroup === "DE" ? "Bitte zuerst aufnehmen." : "Please record the sentence first.");
      return;
    }
    if (lastRecPeak < SILENCE_PEAK_THRESHOLD) {
      alert(selectedGroup === "DE" ? "Die Aufnahme enthält keinen Ton. Bitte erneut aufnehmen." : "This recording appears to contain no audio. Please record again.");
      lastBlob = null; $("#btnNext").disabled = true; $("#btnStartRec").disabled = false; return;
    }

    const wavName   = buildWavName(currentItem);
    const acceptedAt = new Date().toISOString();
    setOverlay(true, UI[selectedGroup].overlayUpload, UI[selectedGroup].overlayWait);
    $("#btnNext").disabled     = true;
    $("#btnStopRec").disabled  = true; $("#btnStartRec").disabled = true;

    try {
      await uploadBlob(lastBlob, wavName, meta.pid, selectedTaskId);
      $("#runStatus").textContent = selectedGroup === "DE" ? "hochgeladen ✓" : "uploaded ✓";
    } catch (e) {
      console.warn(e);
      saveLocal(lastBlob, wavName);
      $("#runStatus").textContent = selectedGroup === "DE" ? "lokal gespeichert" : "saved locally";
    }

    sessionRows.push([
      sessionId, sessionStartIso, meta.pid, selectedGroup,
      selectedTaskId, currentItem.lang, currentItem.condition,
      currentItem.targetToken, String(itemIdx + 1),
      currentItem.promptText,
      currentItem.primes ? currentItem.primes.join("|") : "",
      wavName, acceptedAt, lastDuration.toFixed(3), String(sampleRate)
    ]);

    setOverlay(false);
    nextItem();
  }

  function nextItem() {
    itemIdx++;
    if (itemIdx >= taskItems.length) { finishTask(); return; }
    renderCurrentItem();
  }

  async function finishTask() {
    const csvBlob = buildSessionCsvBlob();
    const csvName = `${meta.pid}__${selectedTaskId}__SESSION__${isoSafeNow()}__S${sessionId}.csv`;
    setOverlay(true, selectedGroup === "DE" ? "Sitzungslog wird hochgeladen…" : "Uploading session log…", UI[selectedGroup].overlayWait);
    let csvUploaded = false;
    try {
      await uploadBlob(csvBlob, csvName, meta.pid, selectedTaskId, "session_log");
      csvUploaded = true;
    } catch (e) {
      console.warn(e); saveLocal(csvBlob, csvName);
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
    $("#doneSummary").textContent = "";
    $("#doneBackRow").style.display = "none";

    const t = UI[selectedGroup];
    $("#doneAllDone").style.display = "block";
    $("#doneAllDone").innerHTML = selectedGroup === "DE"
      ? `<div class="alldone-state">
           <div class="alldone-emoji">🎉</div>
           <div class="alldone-title">Vielen Dank für Ihre Teilnahme!</div>
           <div class="alldone-sub">Sie können den Browser jetzt schließen.</div>
         </div>`
      : `<div class="alldone-state">
           <div class="alldone-emoji">🎉</div>
           <div class="alldone-title">Thank you for participating!</div>
           <div class="alldone-sub">You can now close this tab.</div>
         </div>`;

    launchConfetti();
  }

  $("#btnStartRec").addEventListener("click", startRecording);
  $("#btnStopRec").addEventListener("click",  stopRecording);
  $("#btnNext").addEventListener("click",     acceptAndSave);

  $("#btnDoneBack").addEventListener("click", () => {
    selectedTaskId = null; taskItems = []; itemIdx = 0; currentItem = null;
    show(screens.taskselect);
    updateTaskGrid();
  });

  /* ═══════════════════════════════════════════
     CONFETTI 🎉
  ═══════════════════════════════════════════ */
  function launchConfetti() {
    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const pieces  = ["🎉", "🎊", "✨", "⭐", "🌟", "🎈", "💛", "🌈"];
    const count   = 60;
    const container = $("#confettiContainer") || document.body;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className   = "confetti-piece";
      el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
      el.style.left               = (Math.random() * 100) + "vw";
      el.style.fontSize           = (14 + Math.random() * 22) + "px";
      el.style.animationDuration  = (1.8 + Math.random() * 2.4) + "s";
      el.style.animationDelay     = (Math.random() * 2.5) + "s";
      container.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
  }

  /* ═══════════════════════════════════════════
     INIT — load tasks then wait for user
  ═══════════════════════════════════════════ */
  loadTasks().catch(err => {
    console.error("Failed to load tasks.json:", err);
    alert("Could not load task data. Please check that tasks.json is in the data/ folder and reload the page.");
  });

})();(function () {
  "use strict";

  /* ═══════════════════════════════════════════
     CONFIG
  ═══════════════════════════════════════════ */
  const MAX_REC_SECONDS       = 30;
  const SILENCE_PEAK_THRESHOLD = 0.01;
  const TASKS_JSON_PATH        = "data/tasks.json";

  /* ═══════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════ */
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function show(el) {
    $$(".screen").forEach(x => x.classList.remove("active"));
    el.classList.add("active");
    window.scrollTo(0, 0);
    // move focus to the first heading in the new screen for screen readers
    const h = el.querySelector("h2, h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
  }

  function toggleHidden(sel, showIt) {
    const el = typeof sel === "string" ? $(sel) : sel;
    if (el) el.classList.toggle("hidden", !showIt);
  }

  function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  }

  function randToken(len = 10) {
    const a = new Uint8Array(len);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, b => (b % 36).toString(36)).join("");
  }

  function isoSafeNow() {
    const d   = new Date();
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }

  function csvEscape(s) {
    const str = String(s ?? "");
    return /[",\n]/.test(str) ? `"${str.split('"').join('""')}"` : str;
  }

  function saveLocal(blob, filename) {
    const a   = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function sanitizeToken(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  /* ═══════════════════════════════════════════
     PSEUDO-RANDOM SHUFFLE (seeded — same order every run)
  ═══════════════════════════════════════════ */
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ═══════════════════════════════════════════
     TASK BUILDER — rhyming type
     Works for both English (Task A) and German (Task B)
     Reads vowel list + carriers + seed from JSON task object.
     Produces: 2 items per vowel (C1 + C2), shuffled with
     the constraint that the same vowel never appears twice in a row.
  ═══════════════════════════════════════════ */
  function buildRhymingItems(taskDef) {
    const { id, lang, vowels, carriers, seed } = taskDef;

    // One C1 + one C2 per vowel
    const raw = [];
    for (const v of vowels) {
      raw.push({ vKey: v.key, cond: "C1" });
      raw.push({ vKey: v.key, cond: "C2" });
    }

    // Seeded shuffle
    const rng = mulberry32(seed);
    shuffleInPlace(raw, rng);

    // Fix adjacencies: no same vowel twice in a row
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].vKey === raw[i - 1].vKey) {
        let j = i + 1;
        while (j < raw.length && raw[j].vKey === raw[i].vKey) j++;
        if (j < raw.length) [raw[i], raw[j]] = [raw[j], raw[i]];
      }
    }

    // Build item objects
    const byKey = Object.fromEntries(vowels.map(v => [v.key, v]));
    return raw.map(({ vKey, cond }) => {
      const v = byKey[vKey];
      return {
        taskId:      id,
        lang:        lang,
        condition:   cond,
        targetToken: v.targetToken,
        primes:      v.primes,
        promptText:  carriers[cond]
      };
    });
  }

  /* ═══════════════════════════════════════════
     SESSION STATE
  ═══════════════════════════════════════════ */
  const sessionId       = randToken(10);
  const sessionStartIso = new Date().toISOString();

  let selectedGroup   = null;   // "EN" | "DE"
  let allTaskDefs     = {};     // raw JSON task definitions
  let builtTasks      = {};     // { taskId: { ...def, items: [...] } }
  let completedTasks  = new Set();

  let consentGiven     = false;
  let consentTimeIso   = "";
  let consentUploaded  = false;
  let questionnaireUploaded = false;

  let selectedTaskId   = null;
  let taskItems        = [];
  let itemIdx          = 0;
  let currentItem      = null;
  let returnToRunAfterMic = false;

  /* ─── participant metadata (filled from whichever details form is shown) ─── */
  let meta = {
    pid: "", birthYear: "", sex: "", bundesland: "", city: ""
  };

  /* ═══════════════════════════════════════════
     LOAD TASKS FROM JSON
  ═══════════════════════════════════════════ */
  async function loadTasks() {
    const res  = await fetch(TASKS_JSON_PATH);
    const json = await res.json();

    // Only process keys that don't start with "_" (those are comments/planned)
    for (const [key, def] of Object.entries(json)) {
      if (key.startsWith("_")) continue;
      allTaskDefs[key] = def;

      if (def.type === "rhyming") {
        builtTasks[key] = { ...def, items: buildRhymingItems(def) };
      }
      // Future: "rating", "reading" etc. handled here
    }
  }

  /* ═══════════════════════════════════════════
     BILINGUAL CONTENT
  ═══════════════════════════════════════════ */
  const UI = {
    EN: {
      headerTitle:       "Speech Recording",
      consentTitle:      "Participant Information & Consent",
      consentChkLabel:   "I have read the information above and I consent to participate in this study.",
      consentAgree:      "Agree and continue",
      consentDecline:    "Decline",
      consentFootnote:   "You must tick the box above to continue.",
      scrollHint:        "Scroll inside the box to read all information ↓",
      taskSelTitle:      "Choose a task",
      taskSelSubtitle:   "Please complete both tasks — you may do them in any order.",
      taskSelFootnote:   "Please take a break of at least 15 minutes between tasks if completing both in one session.",
      instrOk:           "I understand — continue",
      instrBack:         "Back",
      micTitle:          "Microphone setup",
      micSubtitle:       "Click Enable microphone and allow access when prompted. Then complete a short test recording.",
      micHint:           "If your recordings are silent, select a different device and redo the test.",
      micFootnote:       "If you encounter any problems, please try Chrome or Edge.",
      micEnable:         "Enable microphone",
      micBegin:          "Begin task",
      micBackToTask:     "Back to task",
      micRefresh:        "Refresh",
      testBoxTitle:      "Test recording",
      testBoxInstr:      'Press <strong>Start test</strong>, wait one second, read the sentence, wait one second, then press <strong>Stop test</strong>. Test recordings are <strong>not saved</strong>.',
      testPrompt:        '"The North Wind and the Sun were disputing which was the stronger."',
      testStart:         "Start test",
      testStop:          "Stop test",
      testPlay:          "Play back",
      testRedo:          "Redo",
      testNotRecorded:   "Not recorded",
      primesLabel:       "Say these three words aloud first:",
      runHintPrimes:     "Press <strong>Start recording</strong>. Say the three words above, then read the sentence. Press <strong>Stop</strong>, then <strong>Next</strong>.",
      runHintNoPrimes:   "Press <strong>Start recording</strong>, read the sentence once, press <strong>Stop</strong>, then <strong>Next</strong>.",
      startRec:          "Start recording",
      stopRec:           "Stop",
      accept:            "Accept & save",
      next:              "Next ▶",
      goMic:             "Microphone setup",
      doneTitle:         "Task complete ✓",
      doneBackMsg:       "You still need to complete the other task. Click below to go back and start it.",
      doneAllDoneMsg:    "You have completed both tasks. Thank you very much for participating!",
      doneBack:          "Back to task selection",
      doneFootnote:      "If any upload failed, the files were saved as local downloads instead.",
      imprintLink:       "Impressum / Imprint",
      overlayUpload:     "Uploading… please wait",
      overlayWait:       "Do not close this tab.",
      overlaySubmit:     "Submitting questionnaire…",
      overlayProcess:    "Processing…",
      taskNameA:         "Task A — English Rhyming",
      taskNameB:         "Task B — German Rhyming",
      taskDescA:         "Say three rhyming words, then record the English sentence.",
      taskDescB:         "Say three rhyming words, then record the German sentence.",
      instrHtmlA: `
        <p><strong>Task A — English Rhyming:</strong> For each item:</p>
        <ul>
          <li>You will see <strong>three English words</strong> that rhyme with the missing word.</li>
          <li>Press <strong>Start recording</strong>.</li>
          <li>In the <strong>same recording</strong>, first say the <strong>three words</strong>, then read the <strong>sentence</strong> aloud.</li>
          <li>The missing word may be a nonsense word — that is expected. Please say it as shown.</li>
          <li>Press <strong>Stop</strong>, then <strong>Next</strong>.</li>
        </ul>`,
      instrHtmlB: `
        <p><strong>Task B — German Rhyming:</strong> For each item:</p>
        <ul>
          <li>You will see <strong>three German words</strong> that rhyme with the missing word. The sentence shows <strong>H__t</strong> as a clue.</li>
          <li>Press <strong>Start recording</strong>.</li>
          <li>In the <strong>same recording</strong>, first say the <strong>three words</strong>, then read the <strong>sentence</strong> aloud.</li>
          <li>The missing word may be a nonsense word — that is expected. Please say it as shown.</li>
          <li>Press <strong>Stop</strong>, then <strong>Next</strong>.</li>
        </ul>`
    },
    DE: {
      headerTitle:       "Sprachaufnahme",
      consentTitle:      "Teilnehmerinformation & Einwilligung",
      consentChkLabel:   "Ich habe die obigen Informationen gelesen und stimme der Teilnahme zu.",
      consentAgree:      "Zustimmen und weiter",
      consentDecline:    "Ablehnen",
      consentFootnote:   "Sie müssen das Kästchen oben ankreuzen, um fortzufahren.",
      scrollHint:        "Im Feld scrollen, um alle Informationen zu lesen ↓",
      taskSelTitle:      "Aufgabe auswählen",
      taskSelSubtitle:   "Bitte absolvieren Sie beide Aufgaben — die Reihenfolge ist frei wählbar.",
      taskSelFootnote:   "Bitte machen Sie eine Pause von mindestens 15 Minuten zwischen den Aufgaben, wenn Sie beide in einer Sitzung absolvieren.",
      instrOk:           "Ich habe verstanden — weiter",
      instrBack:         "Zurück",
      micTitle:          "Mikrofon einrichten",
      micSubtitle:       'Klicken Sie auf „Mikrofon aktivieren" und erlauben Sie den Zugriff. Machen Sie dann eine kurze Testaufnahme.',
      micHint:           "Falls Ihre Aufnahmen stumm sind, wählen Sie ein anderes Gerät und wiederholen Sie den Test.",
      micFootnote:       "Falls Sie Probleme haben, versuchen Sie bitte Chrome oder Edge.",
      micEnable:         "Mikrofon aktivieren",
      micBegin:          "Aufgabe starten",
      micBackToTask:     "Zurück zur Aufgabe",
      micRefresh:        "Aktualisieren",
      testBoxTitle:      "Testaufnahme",
      testBoxInstr:      'Drücken Sie <strong>Test starten</strong>, warten Sie eine Sekunde, lesen Sie den Satz, warten Sie eine Sekunde und drücken Sie dann <strong>Test stoppen</strong>. Testaufnahmen werden <strong>nicht gespeichert</strong>.',
      testPrompt:        '"Der Nordwind und die Sonne stritten sich, wer von ihnen stärker sei."',
      testStart:         "Test starten",
      testStop:          "Test stoppen",
      testPlay:          "Abspielen",
      testRedo:          "Wiederholen",
      testNotRecorded:   "Nicht aufgezeichnet",
      primesLabel:       "Sagen Sie zuerst diese drei Wörter laut:",
      runHintPrimes:     "Drücken Sie <strong>Aufnahme starten</strong>. Sagen Sie die drei Wörter oben, lesen Sie dann den Satz. Drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.",
      runHintNoPrimes:   "Drücken Sie <strong>Aufnahme starten</strong>, lesen Sie den Satz einmal, drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.",
      startRec:          "Aufnahme starten",
      stopRec:           "Stopp",
      accept:            "Akzeptieren & speichern",
      next:              "Weiter ▶",
      goMic:             "Mikrofon einrichten",
      doneTitle:         "Aufgabe abgeschlossen ✓",
      doneBackMsg:       "Sie müssen noch die andere Aufgabe absolvieren. Klicken Sie unten, um zurückzugehen.",
      doneAllDoneMsg:    "Sie haben beide Aufgaben abgeschlossen. Vielen Dank für Ihre Teilnahme!",
      doneBack:          "Zurück zur Aufgabenauswahl",
      doneFootnote:      "Falls ein Upload fehlgeschlagen ist, wurden die Dateien als lokale Downloads gespeichert.",
      imprintLink:       "Impressum / Imprint",
      overlayUpload:     "Wird hochgeladen… bitte warten",
      overlayWait:       "Schließen Sie diesen Tab nicht.",
      overlaySubmit:     "Fragebogen wird übermittelt…",
      overlayProcess:    "Wird verarbeitet…",
      taskNameA:         "Aufgabe A — Englisches Reimen",
      taskNameB:         "Aufgabe B — Deutsches Reimen",
      taskDescA:         "Sagen Sie drei Reimwörter, nehmen Sie dann den englischen Satz auf.",
      taskDescB:         "Sagen Sie drei Reimwörter, nehmen Sie dann den deutschen Satz auf.",
      instrHtmlA: `
        <p><strong>Aufgabe A — Englisches Reimen:</strong> Für jedes Element:</p>
        <ul>
          <li>Sie sehen <strong>drei englische Wörter</strong>, die sich auf das fehlende Wort reimen.</li>
          <li>Drücken Sie <strong>Aufnahme starten</strong>.</li>
          <li>Sagen Sie in <strong>derselben Aufnahme</strong> zuerst die <strong>drei Wörter</strong>, lesen Sie dann den <strong>Satz</strong> laut vor.</li>
          <li>Das fehlende Wort kann ein Nonsens-Wort sein — das ist beabsichtigt. Bitte sprechen Sie es wie gezeigt aus.</li>
          <li>Drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.</li>
        </ul>`,
      instrHtmlB: `
        <p><strong>Aufgabe B — Deutsches Reimen:</strong> Für jedes Element:</p>
        <ul>
          <li>Sie sehen <strong>drei deutsche Wörter</strong>, die sich auf das fehlende Wort reimen. Der Satz zeigt <strong>H__t</strong> als Hinweis.</li>
          <li>Drücken Sie <strong>Aufnahme starten</strong>.</li>
          <li>Sagen Sie in <strong>derselben Aufnahme</strong> zuerst die <strong>drei Wörter</strong>, lesen Sie dann den <strong>Satz</strong> laut vor.</li>
          <li>Das fehlende Wort kann ein Nonsens-Wort sein — das ist beabsichtigt. Bitte sprechen Sie es wie gezeigt aus.</li>
          <li>Drücken Sie <strong>Stopp</strong>, dann <strong>Weiter</strong>.</li>
        </ul>`
    }
  };

  /* ─── consent text ─── */
  const CONSENT_HTML = {
    EN: `
      <p><strong>Thank you very much for participating!</strong><br>
      Please read the following information carefully before you begin.</p>
      <p><strong>About this study:</strong> This recording study is part of ongoing research on phonetic language attrition at the University of Graz — investigating how the sounds of your native language can change when you live in a different language environment. The study is connected to the FWF-funded project <em>"When Your Native Language Sounds Foreign"</em> and contributes to a Master's thesis.</p>
      <p><strong>What you will do:</strong> You will read short sentences aloud and record yourself. The session takes approximately 20 minutes. You will complete two tasks — you may choose the order.</p>
      <p><strong>Before you start (important):</strong></p>
      <ul>
        <li>Please use a laptop or desktop computer (not a phone or tablet).</li>
        <li>Find a quiet room — close windows and silence notifications.</li>
        <li>Sit about 30–50 cm from your microphone and speak clearly at a normal volume.</li>
        <li>For each recording: press <strong>Start recording</strong>, wait one second, speak, wait one second, then press <strong>Stop</strong>.</li>
      </ul>
      <p><strong>Microphone permission:</strong> Your browser will ask for microphone access — please click <strong>Allow</strong>. You can make a test recording before starting. Test recordings are <strong>not saved</strong>.</p>
      <p><strong>Saving recordings:</strong> After each sentence press <strong>Stop</strong> then <strong>Next</strong>. Your recording will upload — this may take a few seconds.</p>
      <p><strong>Data:</strong> Audio recordings will be stored securely and used only for research purposes. Data will be anonymised for publication.</p>
      <p><strong>Voluntary participation:</strong> Participation is voluntary. You may withdraw at any time before submission.</p>
      <p><strong>Contact:</strong> If you have questions or encounter technical problems, please contact the researcher who sent you this link.</p>`,
    DE: `
      <p><strong>Vielen Dank für Ihre Teilnahme!</strong><br>
      Bitte lesen Sie die folgenden Informationen sorgfältig durch, bevor Sie beginnen.</p>
      <p><strong>Zur Studie:</strong> Diese Aufnahme-Studie ist Teil einer laufenden Forschung zur phonetischen Sprachattrition an der Universität Graz. Wir untersuchen, wie sich die Aussprache Ihrer Muttersprache verändern kann, wenn Sie in einer anderen Sprachumgebung leben.</p>
      <p><strong>Was Sie tun werden:</strong> Sie lesen kurze Sätze laut vor und nehmen sich dabei auf. Die Sitzung dauert ca. 20 Minuten. Sie absolvieren zwei Aufgaben — die Reihenfolge ist frei wählbar.</p>
      <p><strong>Wichtige Hinweise vor dem Start:</strong></p>
      <ul>
        <li>Bitte verwenden Sie einen Laptop oder Desktop-Computer (kein Smartphone oder Tablet).</li>
        <li>Suchen Sie einen ruhigen Raum auf — schließen Sie Fenster und schalten Sie Benachrichtigungen stumm.</li>
        <li>Sitzen Sie ca. 30–50 cm vom Mikrofon entfernt und sprechen Sie klar und in normaler Lautstärke.</li>
        <li>Für jede Aufnahme: <strong>Aufnahme starten</strong> drücken, eine Sekunde warten, sprechen, eine Sekunde warten, dann <strong>Stopp</strong> drücken.</li>
      </ul>
      <p><strong>Mikrofonzugriff:</strong> Ihr Browser fragt nach Zugriff auf das Mikrofon — bitte klicken Sie auf <strong>Erlauben</strong>. Sie können vor dem Start eine Testaufnahme machen. Testaufnahmen werden <strong>nicht gespeichert</strong>.</p>
      <p><strong>Aufnahmen speichern:</strong> Nach jedem Satz auf <strong>Akzeptieren &amp; speichern</strong> klicken. Die Aufnahme wird hochgeladen.</p>
      <p><strong>Daten:</strong> Audioaufnahmen werden sicher gespeichert und ausschließlich für Forschungszwecke verwendet. Die Daten werden für Veröffentlichungen anonymisiert.</p>
      <p><strong>Freiwilligkeit:</strong> Die Teilnahme ist freiwillig. Sie können jederzeit vor der Übermittlung zurücktreten.</p>
      <p><strong>Kontakt:</strong> Bei Fragen oder technischen Problemen wenden Sie sich bitte an die Person, die Ihnen diesen Link geschickt hat.</p>`
  };

  /* ═══════════════════════════════════════════
     APPLY UI LANGUAGE
  ═══════════════════════════════════════════ */
  function applyLanguage(group) {
    const t = UI[group];
    document.documentElement.lang = group === "DE" ? "de" : "en";

    // Header
    setText("headerTitle",   t.headerTitle);
    setText("imprintLink",   t.imprintLink);

    // Consent
    setText("consentTitle",    t.consentTitle);
    setHTML("consentText",     CONSENT_HTML[group]);
    setText("consentChkLabel", t.consentChkLabel);
    setText("scrollHintText",  t.scrollHint);
    setText("consentFootnote", t.consentFootnote);
    setAttr("btnConsent",  "textContent", t.consentAgree);
    setAttr("btnDecline",  "textContent", t.consentDecline);

    // Task selection
    setText("taskSelTitle",    t.taskSelTitle);
    setText("taskSelSubtitle", t.taskSelSubtitle);
    setText("taskSelFootnote", t.taskSelFootnote);

    // Instructions
    setText("btnInstrOk",   t.instrOk);
    setText("btnInstrBack", t.instrBack);

    // Mic setup
    setText("micTitle",       t.micTitle);
    setText("micSubtitle",    t.micSubtitle);
    setText("micHint",        t.micHint);
    setText("micFootnote",    t.micFootnote);
    setText("btnInit",        t.micEnable);
    setText("btnBeginTask",   t.micBegin);
    setText("btnBackToTask",  t.micBackToTask);
    setText("btnRefreshMics", t.micRefresh);
    setText("testBoxTitle",   t.testBoxTitle);
    setHTML("testBoxInstr",   t.testBoxInstr);
    setText("testPrompt",     t.testPrompt);
    setText("btnTestStart",   t.testStart);
    setText("btnTestStop",    t.testStop);
    setText("btnTestPlay",    t.testPlay);
    setText("btnTestRedo",    t.testRedo);
    setText("testStatus",     t.testNotRecorded);
    setText("micStatus",      group === "DE" ? "Mikrofon: nicht gestartet" : "Microphone: not started");

    // Recording screen
    setText("primesLabel",  t.primesLabel);
    setText("btnStartRec",  t.startRec);
    setText("btnStopRec",   t.stopRec);
    setText("btnNext",      t.next);
    setText("btnRunGoMic",  t.goMic);

    // Done screen
    setText("doneTitle",      t.doneTitle);
    setText("doneBackMsg",    t.doneBackMsg);
    setText("doneAllDoneMsg", t.doneAllDoneMsg);
    setText("btnDoneBack",    t.doneBack);
    setText("doneFootnote",   t.doneFootnote);

    // Overlay
    setText("overlayTitle", t.overlayUpload);
    setText("overlayMsg",   t.overlayWait);

    // Task grid
    buildTaskGrid(group);
  }

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

  /* ═══════════════════════════════════════════
     TASK GRID (task selection screen)
  ═══════════════════════════════════════════ */
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
      const flags = { A: "🇬🇧", B: "🇦🇹" };
      const flag = flags[def.id] || "";
      card.innerHTML = `<div class="task-flag" aria-hidden="true">${flag}</div><div class="task-name">${name}</div>`;
      grid.appendChild(card);

      card.addEventListener("click", () => { if (!completedTasks.has(key)) pickTask(key); });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!completedTasks.has(key)) pickTask(key); }
      });
    }
  }

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

  /* ═══════════════════════════════════════════
     DOM REFS (screens)
  ═══════════════════════════════════════════ */
  const screens = {
    group:      $("#scr-group"),
    consent:    $("#scr-consent"),
    detailsDE:  $("#scr-details-de"),
    detailsEN:  $("#scr-details-en"),
    q1:         $("#scr-quest-1"),
    q2:         $("#scr-quest-2"),
    q3:         $("#scr-quest-3"),
    q4:         $("#scr-quest-4"),
    q5:         $("#scr-quest-5"),
    q6:         $("#scr-quest-6"),
    q7:         $("#scr-quest-7"),
    q8:         $("#scr-quest-8"),
    taskselect: $("#scr-taskselect"),
    instr:      $("#scr-instr"),
    mic:        $("#scr-mic"),
    run:        $("#scr-run"),
    done:       $("#scr-done")
  };

  /* ═══════════════════════════════════════════
     GROUP SELECTION
  ═══════════════════════════════════════════ */
  function selectGroup(group) {
    selectedGroup = group;
    applyLanguage(group);
    show(screens.consent);
  }

  function handleGroupCardKey(e, group) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectGroup(group); }
  }

  $("#btnGroupEN").addEventListener("click",    () => selectGroup("EN"));
  $("#btnGroupDE").addEventListener("click",    () => selectGroup("DE"));
  $("#btnGroupEN").addEventListener("keydown",  e  => handleGroupCardKey(e, "EN"));
  $("#btnGroupDE").addEventListener("keydown",  e  => handleGroupCardKey(e, "DE"));

  /* ═══════════════════════════════════════════
     CONSENT
  ═══════════════════════════════════════════ */
  const consentChk = $("#consentChk");
  const btnConsent = $("#btnConsent");

  consentChk.addEventListener("change", () => {
    btnConsent.disabled = !consentChk.checked;
  });

  btnConsent.addEventListener("click", () => {
    if (!consentChk.checked) return;
    consentGiven   = true;
    consentTimeIso = new Date().toISOString();
    // Route to correct details screen
    show(selectedGroup === "DE" ? screens.detailsDE : screens.detailsEN);
  });

  $("#btnDecline").addEventListener("click", () => {
    const msg = selectedGroup === "DE"
      ? "Sie haben die Teilnahme abgelehnt. Diese Seite wird jetzt geschlossen."
      : "You chose not to participate. This page will now close.";
    alert(msg);
    try { window.close(); } catch (e) {}
  });

  /* ═══════════════════════════════════════════
     DETAILS — DE GROUP (short form)
  ═══════════════════════════════════════════ */
  const deFields = ["de-pid", "de-birthYear", "de-sex", "de-state", "de-city"];

  function checkDeForm() {
    const ok = deFields.every(id => {
      const el = $(`#${id}`);
      return el && String(el.value || "").trim();
    });
    $("#btnDeDetailsContinue").disabled = !ok;
  }

  deFields.forEach(id => {
    const el = $(`#${id}`);
    if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", checkDeForm);
  });

  $("#btnDeDetailsContinue").addEventListener("click", () => {
    meta.pid        = $("#de-pid").value.trim();
    meta.birthYear  = $("#de-birthYear").value.trim();
    meta.sex        = $("#de-sex").value;
    meta.bundesland = $("#de-state").value;
    meta.city       = $("#de-city").value.trim();
    show(screens.taskselect);
    updateTaskGrid();
  });

  $("#btnDeDetailsBack").addEventListener("click", () => show(screens.consent));

  /* ═══════════════════════════════════════════
     DETAILS — EN GROUP (leads to full questionnaire)
  ═══════════════════════════════════════════ */
  const enFields = ["en-pid", "en-birthYear", "en-sex", "en-state", "en-city"];

  function checkEnForm() {
    const ok = enFields.every(id => {
      const el = $(`#${id}`);
      return el && String(el.value || "").trim();
    });
    $("#btnEnDetailsContinue").disabled = !ok;
  }

  enFields.forEach(id => {
    const el = $(`#${id}`);
    if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", checkEnForm);
  });

  $("#btnEnDetailsContinue").addEventListener("click", () => {
    meta.pid        = $("#en-pid").value.trim();
    meta.birthYear  = $("#en-birthYear").value.trim();
    meta.sex        = $("#en-sex").value;
    meta.bundesland = $("#en-state").value;
    meta.city       = $("#en-city").value.trim();
    // Sync arrival-year computed fields with birth year if available
    computeDerived();
    show(screens.q1);
  });

  $("#btnEnDetailsBack").addEventListener("click", () => show(screens.consent));

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — derived fields
  ═══════════════════════════════════════════ */
  function computeDerived() {
    const currentYear = new Date().getFullYear();
    const birth   = parseInt(meta.birthYear, 10);
    const arrival = parseInt(($('#arrivalYear') || {}).value || "", 10);

    if ($("#derivedAge"))
      $("#derivedAge").value = Number.isFinite(birth) ? String(currentYear - birth) : "";
    if ($("#derivedAgeMigration"))
      $("#derivedAgeMigration").value = (Number.isFinite(birth) && Number.isFinite(arrival)) ? String(arrival - birth) : "";
    if ($("#derivedDuration"))
      $("#derivedDuration").value = Number.isFinite(arrival) ? String(currentYear - arrival) : "";
  }

  $("#arrivalYear")?.addEventListener("input", computeDerived);

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — scale builder
  ═══════════════════════════════════════════ */
  function createScaleBlock(name, label, n, leftLabel, rightLabel) {
    const wrap = document.createElement("div");
    wrap.className = "q-card";

    const legend = document.createElement("fieldset");
    legend.innerHTML = `<legend>${label}</legend>`;

    const row = document.createElement("div");
    row.className = "choice-inline";
    for (let i = 1; i <= n; i++) {
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="radio" name="${name}" value="${i}" /> ${i}`;
      row.appendChild(lab);
    }
    legend.appendChild(row);

    const scaleRow = document.createElement("div");
    scaleRow.className = "row";
    scaleRow.style.justifyContent = "space-between";
    scaleRow.innerHTML = `<span class="scale-label">${leftLabel}</span><span class="scale-label">${rightLabel}</span>`;
    legend.appendChild(scaleRow);

    wrap.appendChild(legend);
    return wrap;
  }

  const PROF_LABELS = [
    ["pronunciation",      "Pronunciation"],
    ["oral_comprehension", "Oral comprehension"],
    ["writing",            "Writing"],
    ["fluency",            "Fluency"],
    ["reading",            "Reading"]
  ];

  const GENERAL_SCALES = [
    ["speakGermanOften",    "How often do you speak German?",                                                "1 = very little",   "5 = very often"],
    ["maintainEnglish",     "Do you consider it important to maintain your English?",                        "1 = not important", "5 = very important"],
    ["passNativeLanguage",  "Would you consider it important to pass on your native language to the next generation?", "1 = not important", "5 = very important"],
    ["friendsGermanEnglish","In general, do you have more German- or English-speaking friends in Austria?", "1 = more English",  "5 = more German"],
    ["homeCulture",         "Do you feel more at home with Austrian or with British culture?",               "1 = more British",  "5 = more Austrian"]
  ];

  const DOMAIN_ITEMS = [
    ["household",        "With household members"],
    ["relatives_outside","With relatives outside of the household"],
    ["friends_outside",  "With friends outside of the household"],
    ["neighbours",       "With neighbours"],
    ["work",             "At work"],
    ["school_uni",       "At school / university"],
    ["public_services",  "For public services"],
    ["shops_services",   "In shops or to contract services"],
    ["leisure",          "For leisure activities"]
  ];

  const MEDIA_SCALES = [
    ["moreLessEnglish", "Do you think you use more or less English since you moved to Austria?",        "1 = less English", "5 = more English"],
    ["futureAustriaUK", "Would you like to move back to the UK or stay in Austria in the future?",      "1 = UK",           "5 = Austria"]
  ];

  function buildQuestionnaireUI() {
    const profBeforeWrap = $("#profBeforeWrap");
    const profNowWrap    = $("#profNowWrap");
    if (profBeforeWrap && profNowWrap) {
      PROF_LABELS.forEach(([key, label]) => {
        profBeforeWrap.appendChild(createScaleBlock(`prof_before_${key}`, label, 10, "1 = very low", "10 = very high"));
        profNowWrap.appendChild(createScaleBlock(`prof_now_${key}`,    label, 10, "1 = very low", "10 = very high"));
      });
    }

    const generalWrap = $("#generalScalesWrap");
    if (generalWrap) {
      GENERAL_SCALES.forEach(([key, label, left, right]) => {
        generalWrap.appendChild(createScaleBlock(key, label, 5, left, right));
      });
    }

    const germanWrap  = $("#germanDomainsWrap");
    const englishWrap = $("#englishDomainsWrap");
    if (germanWrap && englishWrap) {
      DOMAIN_ITEMS.forEach(([key, label]) => {
        germanWrap.appendChild(createScaleBlock(`german_domain_${key}`,  label, 5, "1 = very little", "5 = very often"));
        englishWrap.appendChild(createScaleBlock(`english_domain_${key}`, label, 5, "1 = very little", "5 = very often"));
      });
    }

    const mediaWrap = $("#mediaScalesWrap");
    if (mediaWrap) {
      MEDIA_SCALES.forEach(([key, label, left, right]) => {
        mediaWrap.appendChild(createScaleBlock(key, label, 5, left, right));
      });
    }
  }

  buildQuestionnaireUI();

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — conditional logic
  ═══════════════════════════════════════════ */
  function setupConditionalLogic() {
    const wire = (names, handler) => {
      (Array.isArray(names) ? names : [names]).forEach(name => {
        $$(`input[name="${name}"]`).forEach(el => el.addEventListener("change", handler));
      });
    };
    const wireChk = (id, handler) => $(`#${id}`)?.addEventListener("change", handler);
    const wireSel = (id, handler) => $(`#${id}`)?.addEventListener("change", handler);

    wire("livedAbroad",          () => toggleHidden("#livedAbroadDetails",    getRadio("livedAbroad")          === "1"));
    wireChk("prePrimaryOtherChk", () => toggleHidden("#prePrimaryOtherWrap",  $("#prePrimaryOtherChk")?.checked));
    wire("germanBefore",          () => toggleHidden("#germanBeforeDetails",   getRadio("germanBefore")          === "1"));
    wire("germanAustria",         () => toggleHidden("#germanAustriaDetails",  getRadio("germanAustria")          === "1"));
    wire("expatCommunity",        () => toggleHidden("#expatDetails",          getRadio("expatCommunity")          === "1"));
    wire("backToUK",              () => toggleHidden("#backToUKDetails",       getRadio("backToUK")               === "1"));
    wireChk("hhSpeakEnglishChk",  () => toggleHidden("#hhEnglishVarietyWrap", $("#hhSpeakEnglishChk")?.checked));
    wireChk("hhSpeakGermanChk",   () => toggleHidden("#hhGermanVarietyWrap",  $("#hhSpeakGermanChk")?.checked));
    wireChk("hhSpeakOtherChk",    () => toggleHidden("#hhOtherSpeakWrap",     $("#hhSpeakOtherChk")?.checked));
    wireSel("hhYouToThem", () => {
      toggleHidden("#hhYouToThemOtherWrap",  $("#hhYouToThem")?.value === "Other");
      toggleHidden("#hhYouToThemGermanWrap", $("#hhYouToThem")?.value === "German");
    });
    wireSel("hhThemToYou", () => {
      toggleHidden("#hhThemToYouOtherWrap",   $("#hhThemToYou")?.value === "Other");
      toggleHidden("#hhThemToYouEnglishWrap", $("#hhThemToYou")?.value === "English");
      toggleHidden("#hhThemToYouGermanWrap",  $("#hhThemToYou")?.value === "German");
    });
    wire("hasChildren",          () => toggleHidden("#childrenDetails",       getRadio("hasChildren")           === "1"));
    wire("childOtherNames",      () => toggleHidden("#childOtherNamesWrap",   getRadio("childOtherNames")       === "1"));
    wireSel("ukContactLanguage",  () => toggleHidden("#ukContactLanguageOtherWrap", $("#ukContactLanguage")?.value === "Other"));
    wire("othersCommentEnglish", () => toggleHidden("#othersCommentDetails",  getRadio("othersCommentEnglish")  === "1"));
    wire("englishChanged",       () => toggleHidden("#englishChangedDetails", getRadio("englishChanged")        === "1"));
  }

  setupConditionalLogic();

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — required-field validation
     Scans the currently visible screen for every radio
     group (by name) and checkbox group (by shared name)
     and requires at least one option checked in each,
     but only for groups that are currently visible
     (skips groups hidden inside a collapsed conditional block).
  ═══════════════════════════════════════════ */
  function validateVisibleScreen(screenEl) {
    if (!screenEl) return true;

    const radios = Array.from(screenEl.querySelectorAll('input[type="radio"]'));
    const radioNames = new Set(radios.map(el => el.name).filter(Boolean));
    for (const name of radioNames) {
      const inputs = radios.filter(el => el.name === name);
      const anyVisible = inputs.some(el => el.offsetParent !== null);
      if (!anyVisible) continue; // whole group hidden — not applicable right now
      const answered = inputs.some(el => el.checked);
      if (!answered) return false;
    }

    const checkboxes = Array.from(screenEl.querySelectorAll('input[type="checkbox"][name]'));
    const checkboxNames = new Set(checkboxes.map(el => el.name).filter(Boolean));
    for (const name of checkboxNames) {
      const inputs = checkboxes.filter(el => el.name === name);
      const anyVisible = inputs.some(el => el.offsetParent !== null);
      if (!anyVisible) continue;
      const answered = inputs.some(el => el.checked);
      if (!answered) return false;
    }

    return true;
  }

  function showValidationAlert() {
    alert(selectedGroup === "DE"
      ? "Bitte beantworten Sie alle Fragen auf dieser Seite, bevor Sie fortfahren."
      : "Please answer all questions on this page before continuing.");
  }

  /* ═══════════════════════════════════════════
     QUESTIONNAIRE — navigation
  ═══════════════════════════════════════════ */
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

  $("#btnQ1Next").addEventListener("click", () => qNavGuarded("q1", "q2"));
  $("#btnQ1Back").addEventListener("click", () => qNav("detailsEN"));
  $("#btnQ2Next").addEventListener("click", () => qNavGuarded("q2", "q3"));
  $("#btnQ2Back").addEventListener("click", () => qNav("q1"));
  $("#btnQ3Next").addEventListener("click", () => qNavGuarded("q3", "q4"));
  $("#btnQ3Back").addEventListener("click", () => qNav("q2"));
  $("#btnQ4Next").addEventListener("click", () => qNavGuarded("q4", "q5"));
  $("#btnQ4Back").addEventListener("click", () => qNav("q3"));
  $("#btnQ5Next").addEventListener("click", () => qNavGuarded("q5", "q6"));
  $("#btnQ5Back").addEventListener("click", () => qNav("q4"));
  $("#btnQ6Next").addEventListener("click", () => qNavGuarded("q6", "q7"));
  $("#btnQ6Back").addEventListener("click", () => qNav("q5"));
  $("#btnQ7Next").addEventListener("click", () => qNavGuarded("q7", "q8"));
  $("#btnQ7Back").addEventListener("click", () => qNav("q6"));
  $("#btnQ8Back").addEventListener("click", () => qNav("q7"));


  /* ─── collect & upload questionnaire ─── */
  function valueOf(id) { return ($(`#${id}`)?.value || ""); }
  function checked01(id) { return $(`#${id}`)?.checked ? "1" : "0"; }
  function checkboxList(name) { return $$(`input[name="${name}"]:checked`).map(el => el.value).join("|"); }

  function collectQuestionnaireData() {
    computeDerived();
    const data = {
      participant_id:  meta.pid,
      bundesland:      meta.bundesland,
      city:            meta.city,
      sex:             meta.sex,
      year_of_birth:   meta.birthYear,
      year_arrival_austria: valueOf("arrivalYear"),
      age:             valueOf("derivedAge"),
      age_at_migration: valueOf("derivedAgeMigration"),
      duration_living_austria: valueOf("derivedDuration"),
      lived_other_country_longer_6m: getRadio("livedAbroad"),
      lived_other_country_years: valueOf("abroadYears"),
      lived_other_country_name:  valueOf("abroadCountry"),
      lived_other_country_from:  valueOf("abroadFrom"),
      lived_other_country_to:    valueOf("abroadTo"),
      languages_before_primary_school: checkboxList("prePrimaryLang"),
      languages_before_primary_school_other: valueOf("prePrimaryOther"),
      german_classes_before_austria: getRadio("germanBefore"),
      german_before_variety:    valueOf("germanBeforeVariety"),
      german_before_last_year:  valueOf("germanBeforeLastYear"),
      german_classes_in_austria: getRadio("germanAustria"),
      german_in_austria_variety:    valueOf("germanAustriaVariety"),
      german_in_austria_last_year:  valueOf("germanAustriaLastYear"),
      expat_community:   getRadio("expatCommunity"),
      expat_since_year:  valueOf("expatSinceYear"),
      back_to_uk_since_leaving: getRadio("backToUK"),
      back_to_uk_avg_duration:  valueOf("ukStayDuration"),
      household_languages_spoken_english: checked01("hhSpeakEnglishChk"),
      household_languages_spoken_german:  checked01("hhSpeakGermanChk"),
      household_languages_spoken_other:   checked01("hhSpeakOtherChk"),
      household_languages_spoken_other_text: valueOf("hhOtherSpeak"),
      household_english_variety: valueOf("hhEnglishVariety"),
      household_german_variety:  valueOf("hhGermanVariety"),
      you_to_household_language: valueOf("hhYouToThem"),
      you_to_household_other:    valueOf("hhYouToThemOther"),
      you_to_household_german_variety: valueOf("hhYouToThemGermanVariety"),
      household_to_you_language: valueOf("hhThemToYou"),
      household_to_you_other:    valueOf("hhThemToYouOther"),
      household_to_you_english_variety: valueOf("hhThemToYouEnglishVariety"),
      household_to_you_german_variety:  valueOf("hhThemToYouGermanVariety"),
      has_children:           getRadio("hasChildren"),
      children_english_names: getRadio("childEnglishNames"),
      children_german_names:  getRadio("childGermanNames"),
      children_other_names:   getRadio("childOtherNames"),
      children_other_names_text: valueOf("childOtherNamesText"),
      uk_contact_frequency:  getRadio("ukContactFreq"),
      uk_contact_language:   valueOf("ukContactLanguage"),
      uk_contact_language_other: valueOf("ukContactLanguageOther"),
      uk_contact_method:     valueOf("ukContactMethod"),
      watch_british_tv:          getRadio("watchBritishTV"),
      listen_british_radio:      getRadio("listenBritishRadio"),
      read_british_media:        getRadio("readBritishMedia"),
      listen_austrian_radio:     getRadio("listenAustrianRadio"),
      others_comment_english:    getRadio("othersCommentEnglish"),
      others_comment_accent:     checked01("commentAccent"),
      others_comment_sounds:     checked01("commentSounds"),
      others_comment_words:      checked01("commentWords"),
      others_comment_word_order: checked01("commentWordOrder"),
      others_comment_pitch:      checked01("commentPitch"),
      others_comment_grammar:    checked01("commentGrammar"),
      english_changed:           getRadio("englishChanged"),
      english_changed_accent:    checked01("changedAccent"),
      english_changed_sounds:    checked01("changedSounds"),
      english_changed_words:     checked01("changedWords"),
      english_changed_word_order:checked01("changedWordOrder"),
      english_changed_pitch:     checked01("changedPitch"),
      english_changed_grammar:   checked01("changedGrammar"),
      final_comment:             valueOf("finalComment")
    };

    PROF_LABELS.forEach(([key]) => {
      data[`prof_before_${key}`] = getRadio(`prof_before_${key}`);
      data[`prof_now_${key}`]    = getRadio(`prof_now_${key}`);
    });
    GENERAL_SCALES.forEach(([key]) => data[key] = getRadio(key));
    DOMAIN_ITEMS.forEach(([key]) => {
      data[`german_domain_${key}`]  = getRadio(`german_domain_${key}`);
      data[`english_domain_${key}`] = getRadio(`english_domain_${key}`);
    });
    MEDIA_SCALES.forEach(([key]) => data[key] = getRadio(key));

    return data;
  }

  function buildCsvBlob(data) {
    const header = Object.keys(data);
    const row    = header.map(k => data[k]);
    return new Blob([[header.join(","), row.map(csvEscape).join(",")].join("\n")], { type: "text/csv" });
  }

  $("#btnQuestionnaireDone").addEventListener("click", async () => {
    if (!validateVisibleScreen(screens.q8)) {
      showValidationAlert();
      return;
    }
    const btn = $("#btnQuestionnaireDone");
    btn.disabled = true;
    setOverlay(true, UI[selectedGroup].overlaySubmit, UI[selectedGroup].overlayWait);
    try {
      const qData = collectQuestionnaireData();
      const qBlob = buildCsvBlob(qData);
      const qName = `${meta.pid}__QUESTIONNAIRE__${isoSafeNow()}__S${sessionId}.csv`;
      await uploadBlob(qBlob, qName, meta.pid, "QUESTIONNAIRE", "questionnaire");
      questionnaireUploaded = true;
      show(screens.taskselect);
      updateTaskGrid();
    } catch (e) {
      console.error(e);
      alert(selectedGroup === "DE"
        ? "Der Fragebogen konnte nicht übermittelt werden. Bitte versuchen Sie es erneut."
        : "The questionnaire could not be submitted. Please try again.");
    } finally {
      setOverlay(false);
      btn.disabled = false;
    }
  });

  /* ═══════════════════════════════════════════
     FIREBASE — init
  ═══════════════════════════════════════════ */
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDrO7iy2Ajl0O5qxEACyTB-kP-P21jIWB4",
    authDomain:        "webdesign-a3cfe.firebaseapp.com",
    projectId:         "webdesign-a3cfe",
    storageBucket:     "webdesign-a3cfe.firebasestorage.app",
    messagingSenderId: "506925061339",
    appId:             "1:506925061339:web:fed856b63f7df2dfd3e8fe"
  };

  // Firebase is loaded via CDN scripts in index.html before app.js
  const firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  const db          = firebase.firestore();

  /* ═══════════════════════════════════════════
     UPLOAD — Firestore
     WAV files  → "recordings" collection (base64-encoded)
     CSV files  → "sessions" collection (plain text)
  ═══════════════════════════════════════════ */
  async function uploadBlob(blob, filename, pid, taskId, itemLabel) {
    // Convert blob to base64 string
    const base64 = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload  = () => res(String(fr.result).split(",")[1]);
      fr.readAsDataURL(blob);
    });

    const isWav = blob.type === "audio/wav" || filename.endsWith(".wav");
    const collection = isWav ? "recordings" : "sessions";

    const doc = {
      filename,
      pid,
      session_id:   sessionId,
      task_id:      taskId,
      item_label:   itemLabel || `${taskId} item ${String(itemIdx + 1).padStart(2, "0")}`,
      group:        selectedGroup,
      mime:         blob.type || "application/octet-stream",
      data_base64:  base64,
      uploaded_at:  firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(collection).add(doc);
  }

  const overlay      = $("#overlay");
  const overlayTitle = $("#overlayTitle");
  const overlayMsg   = $("#overlayMsg");

  function setOverlay(on, title, msg) {
    overlayTitle.textContent = title || "";
    overlayMsg.textContent   = msg   || "";
    overlay.classList.toggle("active", !!on);
  }

  /* ═══════════════════════════════════════════
     TASK SELECTION & INSTRUCTIONS
  ═══════════════════════════════════════════ */
  function pickTask(taskKey) {
    if (completedTasks.has(taskKey)) return;
    selectedTaskId = taskKey;
    const def = builtTasks[taskKey];
    taskItems  = def ? def.items.slice() : [];
    itemIdx    = 0;
    currentItem = null;

    const t    = UI[selectedGroup];
    const name = t[`taskName${def.id}`] || def.name_en;
    const html = t[`instrHtml${def.id}`] || "<p>Instructions not available.</p>";

    $("#instrTitle").textContent = name;
    $("#instrBody").innerHTML    = html;
    show(screens.instr);
  }

  $("#btnInstrOk").addEventListener("click",   () => show(screens.mic));
  $("#btnInstrBack").addEventListener("click",  () => show(screens.taskselect));

  /* ═══════════════════════════════════════════
     AUDIO / MIC
  ═══════════════════════════════════════════ */
  let micReady        = false;
  let audioCtx        = null, stream = null, source = null, workletNode = null, zeroGain = null;
  let selectedDeviceId = "";
  let workletModuleUrl = null;
  let testObjUrl       = null;

  let recording      = false;
  let recBuffers     = [], totalLength = 0, sampleRate = 48000;
  let lastBlob       = null, lastDuration = 0, lastRecPeak = 0;
  let recPeak        = 0, testPeak = 0;
  let recTimer       = null, testTimer = null;
  let recStartMs     = 0,   testStartMs = 0;

  let testRecording  = false;
  let testBuffers    = [], testTotalLength = 0;
  let testBlob       = null, testReady = false;

  const micStatusEl = $("#micStatus");
  const micLevelEl  = $("#micLevel");
  const micSrEl     = $("#micSr");
  const testStatusEl = $("#testStatus");
  const testPlayer   = $("#testPlayer");
  const micSel       = $("#micSel");
  const testBox      = $("#testBox");

  function setMicStatus(t) { if (micStatusEl) micStatusEl.textContent = t; }
  function setTestStatus(t) { if (testStatusEl) testStatusEl.textContent = t; }

  function computeLevel(input) {
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const db = 20 * Math.log10(Math.sqrt(sum / input.length) + 1e-12);
    if (micLevelEl) micLevelEl.textContent = `Level: ${db.toFixed(1)} dBFS`;
  }

  function updatePeak(arr, isTest) {
    let peak = 0;
    for (let i = 0; i < arr.length; i++) { const a = Math.abs(arr[i]); if (a > peak) peak = a; }
    if (isTest) testPeak = Math.max(testPeak, peak);
    else        recPeak  = Math.max(recPeak,  peak);
  }

  function floatTo16BitPCM(view, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
    }
  }

  function writeWavHeader(view, sr, nCh, nFrames) {
    const wr = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    const bps = 2, ba = nCh * bps, br = sr * ba;
    wr(view, 0, "RIFF"); view.setUint32(4, 36 + nFrames * ba, true);
    wr(view, 8, "WAVE"); wr(view, 12, "fmt "); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, nCh, true);
    view.setUint32(24, sr, true); view.setUint32(28, br, true);
    view.setUint16(32, ba, true); view.setUint16(34, 16, true);
    wr(view, 36, "data"); view.setUint32(40, nFrames * ba, true);
  }

  function encodeWavFromBuffers(buffers, totalLen) {
    const mono = new Float32Array(totalLen);
    let off = 0;
    for (const b of buffers) { mono.set(b, off); off += b.length; }
    const buf  = new ArrayBuffer(44 + mono.length * 2);
    const view = new DataView(buf);
    writeWavHeader(view, sampleRate, 1, mono.length);
    floatTo16BitPCM(view, 44, mono);
    return new Blob([view], { type: "audio/wav" });
  }

  function encodeWav() { return encodeWavFromBuffers(recBuffers, totalLength); }

  function resetTestUI() {
    testRecording = false; testBuffers = []; testTotalLength = 0;
    testBlob = null; testReady = false; testPeak = 0;
    if (testTimer) { clearInterval(testTimer); testTimer = null; }
    if (testObjUrl) { try { URL.revokeObjectURL(testObjUrl); } catch (e) {} testObjUrl = null; }
    setTestStatus(UI[selectedGroup]?.testNotRecorded || "Not recorded");
    $("#btnTestStart").disabled = !micReady;
    $("#btnTestStop").disabled  = true;
    $("#btnTestPlay").disabled  = true;
    $("#btnTestRedo").disabled  = true;
    testPlayer.style.display = "none"; testPlayer.src = "";
    $("#btnBeginTask").disabled = true;
    $("#btnBackToTask").style.display = returnToRunAfterMic ? "inline-block" : "none";
  }

  function cleanupAudioOnFailure() {
    try { stream?.getTracks().forEach(t => t.stop()); } catch (e) {}
    stream = null;
    try { if (audioCtx?.state !== "closed") audioCtx?.close(); } catch (e) {}
    audioCtx = null; source = null; workletNode = null; zeroGain = null;
    if (workletModuleUrl) { try { URL.revokeObjectURL(workletModuleUrl); } catch (e) {} workletModuleUrl = null; }
    micReady = false;
    if (micSel) { micSel.innerHTML = `<option value="">Enable microphone to list devices…</option>`; micSel.disabled = true; }
    $("#btnRefreshMics").disabled = true;
  }

  async function populateMicList() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    let devices = [];
    try { devices = await navigator.mediaDevices.enumerateDevices(); } catch (e) { return; }
    const inputs = devices.filter(d => d.kind === "audioinput");
    micSel.innerHTML = "";
    if (!inputs.length) {
      micSel.innerHTML = `<option value="">No microphone devices found</option>`;
      micSel.disabled = true; return;
    }
    inputs.forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId; opt.textContent = d.label || `Microphone ${idx + 1}`;
      micSel.appendChild(opt);
    });
    try {
      const track    = stream?.getAudioTracks?.()[0];
      const settings = track?.getSettings?.() || {};
      const currentId = settings.deviceId || selectedDeviceId || "";
      if (currentId) { micSel.value = currentId; selectedDeviceId = micSel.value || selectedDeviceId; }
      else selectedDeviceId = micSel.value;
    } catch (e) { selectedDeviceId = micSel.value; }
    micSel.disabled = false;
    $("#btnRefreshMics").disabled = false;
  }

  async function switchMic(deviceId) {
    if (!deviceId || !navigator.mediaDevices?.getUserMedia) return;
    if (!audioCtx || !workletNode) return;
    if (testRecording) { alert("Please stop the test first."); return; }
    if (recording)     { alert("Please stop the recording first."); return; }
    resetTestUI();
    setMicStatus("mic: switching…");
    try { stream?.getTracks().forEach(t => t.stop()); } catch (e) {}
    stream = null;
    try { source?.disconnect(); } catch (e) {}
    source = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 },
                 noiseSuppression: false, echoCancellation: false, autoGainControl: false }
      });
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(workletNode);
      selectedDeviceId = deviceId;
      setMicStatus(selectedGroup === "DE" ? "Mikrofon: bereit" : "mic: ready");
      micReady = true;
      testBox.style.display = "block";
      resetTestUI();
      await populateMicList();
    } catch (e) {
      console.error(e);
      setMicStatus("mic: error");
      alert(selectedGroup === "DE"
        ? "Mikrofon konnte nicht gewechselt werden. Bitte ein anderes Gerät wählen oder die Seite neu laden."
        : "Switching microphone failed. Please try a different device or reload the page.");
      cleanupAudioOnFailure();
      $("#btnInit").disabled = false;
    }
  }

  async function initMic() {
    if (micReady) return;
    $("#btnInit").disabled = true;
    setMicStatus(selectedGroup === "DE" ? "Mikrofon wird gestartet…" : "mic: starting…");
    try {
      const constraints = {
        channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 },
        noiseSuppression: false, echoCancellation: false, autoGainControl: false
      };
      if (selectedDeviceId) constraints.deviceId = { exact: selectedDeviceId };

      stream   = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      try { await audioCtx.resume(); } catch (e) {}
      sampleRate = audioCtx.sampleRate;
      if (micSrEl) micSrEl.textContent = `sr: ${sampleRate} Hz`;

      source = audioCtx.createMediaStreamSource(stream);

      const workletCode = `
        class P extends AudioWorkletProcessor {
          process(inputs) {
            const ch = inputs[0];
            if (!ch || !ch.length) return true;
            const n = ch[0].length, mono = new Float32Array(n);
            for (let c = 0; c < ch.length; c++) {
              if (ch[c]) for (let i = 0; i < n; i++) mono[i] += ch[c][i] / ch.length;
            }
            this.port.postMessage(mono);
            return true;
          }
        }
        registerProcessor('rec-p', P);`;

      workletModuleUrl = URL.createObjectURL(new Blob([workletCode], { type: "application/javascript" }));
      try { await audioCtx.audioWorklet.addModule(workletModuleUrl); }
      finally { try { URL.revokeObjectURL(workletModuleUrl); } catch (e) {} workletModuleUrl = null; }

      workletNode = new AudioWorkletNode(audioCtx, "rec-p");
      zeroGain    = audioCtx.createGain(); zeroGain.gain.value = 0;
      source.connect(workletNode); workletNode.connect(zeroGain); zeroGain.connect(audioCtx.destination);

      workletNode.port.onmessage = (e) => {
        const d = e.data;
        if (testRecording) updatePeak(d, true);
        if (recording)     updatePeak(d, false);
        if (testRecording) {
          const c = new Float32Array(d.length); c.set(d);
          testBuffers.push(c); testTotalLength += c.length; computeLevel(c); return;
        }
        if (recording) {
          const c = new Float32Array(d.length); c.set(d);
          recBuffers.push(c); totalLength += c.length; computeLevel(c); return;
        }
        computeLevel(d);
      };

      setMicStatus(selectedGroup === "DE" ? "Mikrofon: bereit" : "mic: ready");
      micReady = true;
      await populateMicList();
      testBox.style.display = "block";
      resetTestUI();
    } catch (e) {
      console.error(e);
      cleanupAudioOnFailure();
      setMicStatus("mic: error");
      alert(selectedGroup === "DE"
        ? "Mikrofon-Initialisierung fehlgeschlagen.\n\nBitte verwenden Sie Chrome/Edge, laden Sie die Seite neu und stellen Sie sicher, dass der Mikrofonzugriff erlaubt ist."
        : "Microphone initialisation failed.\n\nPlease use Chrome/Edge, reload the page, and make sure microphone permissions are allowed.");
      $("#btnInit").disabled = false;
      return;
    }
    $("#btnInit").disabled = true;
  }

  $("#btnInit").addEventListener("click", initMic);
  $("#btnRefreshMics").addEventListener("click", () => populateMicList());
  micSel.addEventListener("change", () => {
    const id = micSel.value;
    if (!id) return;
    selectedDeviceId = id;
    if (micReady) switchMic(id);
  });

  /* ─── test recording ─── */
  function startTest() {
    if (!micReady || !audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    if (recording) { alert("Please finish the current recording first."); return; }
    testRecording = true; testBuffers = []; testTotalLength = 0; testBlob = null; testReady = false; testPeak = 0;
    setTestStatus(selectedGroup === "DE" ? "Test: läuft…" : "test: recording…");
    $("#btnTestStart").disabled = true; $("#btnTestStop").disabled = false;
    $("#btnTestPlay").disabled  = true; $("#btnTestRedo").disabled  = true;
    testPlayer.style.display = "none"; testPlayer.src = "";
    $("#btnBeginTask").disabled = true;
    testStartMs = Date.now();
    testTimer = setInterval(() => { if (testRecording && Date.now() - testStartMs >= MAX_REC_SECONDS * 1000) stopTest(); }, 250);
  }

  function stopTest() {
    if (!testRecording) return;
    testRecording = false;
    if (testTimer) { clearInterval(testTimer); testTimer = null; }
    if (testPeak < SILENCE_PEAK_THRESHOLD) {
      setTestStatus(selectedGroup === "DE" ? "Test: kein Ton erkannt ⚠" : "test: no audio detected ⚠");
      alert(selectedGroup === "DE"
        ? "In der Testaufnahme wurde kein Ton erkannt.\n\nBitte wählen Sie ein anderes Mikrofon oder überprüfen Sie Ihre Einstellungen."
        : "No audio detected in the test.\n\nPlease select a different microphone device and try again.");
      resetTestUI(); return;
    }
    testBlob  = encodeWavFromBuffers(testBuffers, testTotalLength);
    testReady = true;
    setTestStatus(selectedGroup === "DE" ? "Test: bereit" : "test: ready (play or redo)");
    $("#btnTestStop").disabled = true; $("#btnTestStart").disabled = true;
    $("#btnTestPlay").disabled = false; $("#btnTestRedo").disabled = false;
    testPlayer.style.display = "block";
    if (testObjUrl) { try { URL.revokeObjectURL(testObjUrl); } catch (e) {} }
    testObjUrl = URL.createObjectURL(testBlob);
    testPlayer.src = testObjUrl;
    $("#btnBeginTask").disabled = false;
  }

  $("#btnTestStart").addEventListener("click", startTest);
  $("#btnTestStop").addEventListener("click",  stopTest);
  $("#btnTestPlay").addEventListener("click",  () => { if (testReady) testPlayer.play().catch(() => {}); });
  $("#btnTestRedo").addEventListener("click",  () => resetTestUI());

  /* ─── go-to-mic / back-to-task ─── */
  $("#btnRunGoMic").addEventListener("click", () => {
    if (recording)     { alert("Please stop the recording first."); return; }
    if (testRecording) { alert("Please stop the test recording first."); return; }
    returnToRunAfterMic = true;
    resetTestUI();
    $("#btnBackToTask").style.display = "inline-block";
    show(screens.mic);
  });

  $("#btnBackToTask").addEventListener("click", () => {
    if (!micReady)  { alert(selectedGroup === "DE" ? "Bitte zuerst Mikrofon aktivieren." : "Please enable the microphone first."); return; }
    if (!testReady) { alert(selectedGroup === "DE" ? "Bitte zuerst Testaufnahme abschließen." : "Please complete the test recording first."); return; }
    $("#btnBackToTask").style.display = "none";
    returnToRunAfterMic = false;
    show(screens.run);
    renderCurrentItem();
  });

  $("#btnBeginTask").addEventListener("click", () => {
    if (!micReady || !audioCtx || !stream) { alert(selectedGroup === "DE" ? "Bitte zuerst Mikrofon aktivieren." : "Please enable the microphone first."); return; }
    if (!testReady) { alert(selectedGroup === "DE" ? "Bitte zuerst Testaufnahme abschließen." : "Please complete the test recording first."); return; }
    if (returnToRunAfterMic) {
      $("#btnBackToTask").style.display = "none";
      returnToRunAfterMic = false;
      show(screens.run); renderCurrentItem(); return;
    }
    startTaskRun();
  });

  /* ═══════════════════════════════════════════
     RUN TASK
  ═══════════════════════════════════════════ */
  const sessionRows = [];
  const CSV_HEADER  = [
    "session_id","session_start_iso","participant_id","group","task","lang","condition",
    "target_token","item_index","prompt_text","primes","filename_wav","accepted_at_iso",
    "duration_seconds","sample_rate_hz"
  ];
  const takeCounters = Object.create(null);

  function nextTakeNumber(pid, targetToken, lang, cond) {
    const key = `${pid}__${targetToken}__${lang}__${cond}`;
    const n   = (takeCounters[key] || 0) + 1;
    takeCounters[key] = n;
    return String(n).padStart(2, "0");
  }

  function buildWavName(item) {
    const tok  = sanitizeToken(item.targetToken || "unknown");
    const take = nextTakeNumber(meta.pid, tok, item.lang, item.condition);
    return `${meta.pid}_${tok}_${item.lang}_${item.condition}_${take}.wav`;
  }

  function buildSessionCsvBlob() {
    return new Blob(
      [[CSV_HEADER.join(","), ...sessionRows.map(r => r.map(csvEscape).join(","))].join("\n")],
      { type: "text/csv" }
    );
  }

  function renderCurrentItem() {
    const def = builtTasks[selectedTaskId];
    const t   = UI[selectedGroup];
    const N   = taskItems.length || 0;

    $("#runTaskLabel").textContent = def ? (t[`taskName${def.id}`] || def.name_en) : `Task ${selectedTaskId}`;
    $("#runProgress").textContent  = `${selectedGroup === "DE" ? "Element" : "Item"} ${Math.min(itemIdx + 1, Math.max(N, 1))} / ${Math.max(N, 1)}`;
    currentItem = taskItems[itemIdx] || null;

    const primesBox   = $("#primesBox");
    const primesWords = $("#primesWords");

    if (currentItem?.primes?.length) {
      primesBox.style.display = "block";
      primesWords.innerHTML   = "";
      currentItem.primes.forEach(w => {
        const span = document.createElement("span");
        span.className = "prime-word"; span.textContent = w;
        primesWords.appendChild(span);
      });
      $("#runGroupTitle").textContent = selectedGroup === "DE" ? "Sagen Sie diese drei Wörter und dann den Satz (in einer Aufnahme):" : "Say the 3 words and then the sentence (in one recording):";
      $("#runHint").innerHTML = t.runHintPrimes;
    } else {
      primesBox.style.display = "none";
      primesWords.innerHTML   = "";
      $("#runGroupTitle").textContent = selectedGroup === "DE" ? "Lesen Sie den Satz laut vor:" : "Read the sentence aloud:";
      $("#runHint").innerHTML = t.runHintNoPrimes;
    }

    $("#promptDisplay").textContent = currentItem ? currentItem.promptText : "—";
    $("#runStatus").textContent     = selectedGroup === "DE" ? "bereit" : "idle";

    recording = false; recBuffers = []; totalLength = 0;
    lastBlob = null; lastDuration = 0; recPeak = 0; lastRecPeak = 0;
    if (recTimer) { clearInterval(recTimer); recTimer = null; }

    $("#btnStartRec").disabled = N === 0;
    $("#btnStopRec").disabled  = true;
    $("#btnNext").disabled     = true;
  }

  function startTaskRun() {
    if (!builtTasks[selectedTaskId]) { alert("Task not found."); show(screens.taskselect); return; }
    show(screens.run);
    renderCurrentItem();
  }

  function startRecording() {
    if (recording || !audioCtx) return;
    if (testRecording) { alert("Please stop the test recording first."); return; }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    recBuffers = []; totalLength = 0; lastBlob = null; lastDuration = 0; recPeak = 0;
    recording = true;
    $("#runStatus").textContent = selectedGroup === "DE" ? "läuft…" : "recording…";
    $("#btnStartRec").disabled = true; $("#btnStopRec").disabled = false;
    $("#btnNext").disabled    = true;
    recStartMs = Date.now();
    recTimer   = setInterval(() => { if (recording && Date.now() - recStartMs >= MAX_REC_SECONDS * 1000) stopRecording(); }, 250);
  }

  function stopRecording() {
    if (!recording) return;
    recording = false;
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    if (recPeak < SILENCE_PEAK_THRESHOLD) {
      $("#runStatus").textContent = selectedGroup === "DE" ? "kein Ton erkannt ⚠" : "no audio detected ⚠";
      alert(selectedGroup === "DE"
        ? "In dieser Aufnahme wurde kein Ton erkannt.\n\nBitte überprüfen Sie Ihr Mikrofon und versuchen Sie es erneut."
        : "No audio detected in this recording.\n\nPlease check your microphone and record again.");
      lastBlob = null; lastDuration = 0;
      $("#btnStopRec").disabled = true; $("#btnNext").disabled = true; $("#btnStartRec").disabled = false;
      return;
    }
    lastBlob     = encodeWav();
    lastDuration = totalLength / sampleRate;
    lastRecPeak  = recPeak;
    $("#runStatus").textContent = selectedGroup === "DE" ? "gestoppt" : "stopped";
    $("#btnStopRec").disabled = true; $("#btnNext").disabled = false;
  }

  async function acceptAndSave() {
    if (!lastBlob || !currentItem) {
      alert(selectedGroup === "DE" ? "Bitte zuerst aufnehmen." : "Please record the sentence first.");
      return;
    }
    if (lastRecPeak < SILENCE_PEAK_THRESHOLD) {
      alert(selectedGroup === "DE" ? "Die Aufnahme enthält keinen Ton. Bitte erneut aufnehmen." : "This recording appears to contain no audio. Please record again.");
      lastBlob = null; $("#btnNext").disabled = true; $("#btnStartRec").disabled = false; return;
    }

    const wavName   = buildWavName(currentItem);
    const acceptedAt = new Date().toISOString();
    setOverlay(true, UI[selectedGroup].overlayUpload, UI[selectedGroup].overlayWait);
    $("#btnNext").disabled     = true;
    $("#btnStopRec").disabled  = true; $("#btnStartRec").disabled = true;

    try {
      await uploadBlob(lastBlob, wavName, meta.pid, selectedTaskId);
      $("#runStatus").textContent = selectedGroup === "DE" ? "hochgeladen ✓" : "uploaded ✓";
    } catch (e) {
      console.warn(e);
      saveLocal(lastBlob, wavName);
      $("#runStatus").textContent = selectedGroup === "DE" ? "lokal gespeichert" : "saved locally";
    }

    sessionRows.push([
      sessionId, sessionStartIso, meta.pid, selectedGroup,
      selectedTaskId, currentItem.lang, currentItem.condition,
      currentItem.targetToken, String(itemIdx + 1),
      currentItem.promptText,
      currentItem.primes ? currentItem.primes.join("|") : "",
      wavName, acceptedAt, lastDuration.toFixed(3), String(sampleRate)
    ]);

    setOverlay(false);
    nextItem();
  }

  function nextItem() {
    itemIdx++;
    if (itemIdx >= taskItems.length) { finishTask(); return; }
    renderCurrentItem();
  }

  async function finishTask() {
    const csvBlob = buildSessionCsvBlob();
    const csvName = `${meta.pid}__${selectedTaskId}__SESSION__${isoSafeNow()}__S${sessionId}.csv`;
    setOverlay(true, selectedGroup === "DE" ? "Sitzungslog wird hochgeladen…" : "Uploading session log…", UI[selectedGroup].overlayWait);
    let csvUploaded = false;
    try {
      await uploadBlob(csvBlob, csvName, meta.pid, selectedTaskId, "session_log");
      csvUploaded = true;
    } catch (e) {
      console.warn(e); saveLocal(csvBlob, csvName);
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
    $("#doneSummary").textContent = "";
    $("#doneBackRow").style.display = "none";

    const t = UI[selectedGroup];
    $("#doneAllDone").style.display = "block";
    $("#doneAllDone").innerHTML = selectedGroup === "DE"
      ? `<div class="alldone-state">
           <div class="alldone-emoji">🎉</div>
           <div class="alldone-title">Vielen Dank für Ihre Teilnahme!</div>
           <div class="alldone-sub">Sie können den Browser jetzt schließen.</div>
         </div>`
      : `<div class="alldone-state">
           <div class="alldone-emoji">🎉</div>
           <div class="alldone-title">Thank you for participating!</div>
           <div class="alldone-sub">You can now close this tab.</div>
         </div>`;

    launchConfetti();
  }

  $("#btnStartRec").addEventListener("click", startRecording);
  $("#btnStopRec").addEventListener("click",  stopRecording);
  $("#btnNext").addEventListener("click",     acceptAndSave);

  $("#btnDoneBack").addEventListener("click", () => {
    selectedTaskId = null; taskItems = []; itemIdx = 0; currentItem = null;
    show(screens.taskselect);
    updateTaskGrid();
  });

  /* ═══════════════════════════════════════════
     CONFETTI 🎉
  ═══════════════════════════════════════════ */
  function launchConfetti() {
    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const pieces  = ["🎉", "🎊", "✨", "⭐", "🌟", "🎈", "💛", "🌈"];
    const count   = 60;
    const container = $("#confettiContainer") || document.body;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className   = "confetti-piece";
      el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
      el.style.left               = (Math.random() * 100) + "vw";
      el.style.fontSize           = (14 + Math.random() * 22) + "px";
      el.style.animationDuration  = (1.8 + Math.random() * 2.4) + "s";
      el.style.animationDelay     = (Math.random() * 2.5) + "s";
      container.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
  }

  /* ═══════════════════════════════════════════
     INIT — load tasks then wait for user
  ═══════════════════════════════════════════ */
  loadTasks().catch(err => {
    console.error("Failed to load tasks.json:", err);
    alert("Could not load task data. Please check that tasks.json is in the data/ folder and reload the page.");
  });

})();
