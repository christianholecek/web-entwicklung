const btnPickA     = document.getElementById("btnPickA");
const btnPickB     = document.getElementById("btnPickB");
const taskName     = document.getElementById("taskName");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const mainContent  = document.getElementById("mainContent");
const statusMsg    = document.getElementById("statusMsg");

let allTasks      = {};
let currentTask   = null;
let currentTaskKey = null;
let currentItems  = [];
let currentIndex  = 0;
const completedTasks = new Set();

async function loadTasks() {
  try {
    const res = await fetch("data/tasks.json");
    allTasks = await res.json();
  } catch (err) {
    statusMsg.textContent = "Fehler beim Laden der JSON-Datei.";
    console.error(err);
  }
}

function startTask(taskKey) {
  if (completedTasks.has(taskKey)) return;

  currentTaskKey = taskKey;
  currentTask    = allTasks[taskKey];
  currentItems   = currentTask.items;
  currentIndex   = 0;

  btnPickA.classList.toggle("active", taskKey === "taskA");
  btnPickB.classList.toggle("active", taskKey === "taskB");

  taskName.textContent  = currentTask.name;
  statusMsg.textContent = "";

  renderItem();
}

function renderItem() {
  const item  = currentItems[currentIndex];
  const total = currentItems.length;
  const pct   = ((currentIndex + 1) / total) * 100;

  progressText.textContent = `${currentIndex + 1} / ${total}`;
  progressFill.style.width = pct + "%";

  const primesHTML = item.primes
    .map(w => `<span class="prime-chip">${w}</span>`)
    .join("");

  mainContent.innerHTML = `
    <div>
      <div class="section-label">Reimwörter</div>
      <div class="primes-list">${primesHTML}</div>
    </div>
    <div>
      <div class="section-label">Trägersatz</div>
      <div class="sentence-box">
        <div id="promptDisplay">${item.promptText}</div>
      </div>
    </div>
    <div class="actions">
      <button class="btn-next" id="btnNext">Weiter &rarr;</button>
    </div>
  `;

  document.getElementById("btnNext").addEventListener("click", nextItem);
}

function nextItem() {
  currentIndex++;

  if (currentIndex < currentItems.length) {
    renderItem();
  } else {
    finishCurrentTask();
  }
}

function finishCurrentTask() {
  completedTasks.add(currentTaskKey);

  // disable and style the finished task button
  const doneBtn = currentTaskKey === "taskA" ? btnPickA : btnPickB;
  doneBtn.disabled = true;
  doneBtn.classList.remove("active");
  doneBtn.classList.add("done");

  if (completedTasks.size >= 2) {
    showAllDone();
    return;
  }

  progressText.textContent = `${currentItems.length} / ${currentItems.length}`;
  progressFill.style.width = "100%";

  mainContent.innerHTML = `
    <div class="done-state">
      <div class="done-badge">&#10003;</div>
      <div class="done-title">${currentTask.name} abgeschlossen</div>
      <div class="done-sub">Wählen Sie die andere Aufgabe, um fortzufahren.</div>
    </div>
  `;

  taskName.textContent = "Aufgabe abgeschlossen";
}

function showAllDone() {
  // lock both buttons
  btnPickA.disabled = true;
  btnPickB.disabled = true;
  btnPickA.classList.remove("active");
  btnPickB.classList.remove("active");
  btnPickA.classList.add("done");
  btnPickB.classList.add("done");

  taskName.textContent  = "Alle Aufgaben erledigt";
  progressText.textContent = "";
  progressFill.style.width = "100%";

  mainContent.innerHTML = `
    <div class="alldone-state">
      <div style="font-size: 52px; line-height: 1;">&#127881;</div>
      <div class="alldone-title">Vielen Dank für Ihre Teilnahme!</div>
      <div class="alldone-sub">Sie können den Browser jetzt schließen.</div>
    </div>
  `;

  launchConfetti();
}

function launchConfetti() {
  const pieces = ["🎉", "🎊", "✨", "⭐", "🌟", "🎈", "💛"];
  const count  = 60;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className   = "confetti-piece";
    el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    el.style.left            = (Math.random() * 100) + "vw";
    el.style.fontSize        = (14 + Math.random() * 22) + "px";
    el.style.animationDuration  = (1.8 + Math.random() * 2.4) + "s";
    el.style.animationDelay     = (Math.random() * 2.5) + "s";
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}

btnPickA.addEventListener("click", () => startTask("taskA"));
btnPickB.addEventListener("click", () => startTask("taskB"));

loadTasks();
