import { firebaseConfig } from "./firebase-config.js";

/* ============================================================
   My Planner — personal to-do, scheduler & weekly planner.
   Vanilla ES module. Offline-first (localStorage) with optional
   live Firestore sync. Ported from the buy-list app.
   ============================================================ */

const boardIdKey = "planner-board-id";
const themeKey = "planner-theme";
const firebaseVersion = "12.7.0";

// Web Push public key (safe to expose). The matching private key lives only in
// the GitHub Actions secret that sends the notifications.
const VAPID_PUBLIC = "BJMWbGa87PpgkaiuMkwktcycVCHoJvaVWy_qPiR_2xwYUYPeQiQKm2f68fmVdw2CJTcvvG8JtMP-BiZCnHscsmk";

/* The board id (private space) lives in the ?board= URL. */
const boardId = getBoardId();
const listsKey = `planner-lists:${boardId}`;
const tasksKey = `planner-tasks:${boardId}`;
const activeKey = `planner-active-list:${boardId}`;
const notifiedKey = `planner-notified:${boardId}`;

const LIST_COLORS = ["#3f5cf0", "#2f8f5b", "#d84b32", "#c98412", "#9b59d0", "#2bb1c4", "#e05f9a", "#6b7280"];
let WEEK_START_HOUR = 6;
let WEEK_END_HOUR = 23;

// White-text-friendly accent presets ("" = theme default).
const ACCENTS = ["", "#3f5cf0", "#7c4dff", "#2bb1c4", "#2f8f5b", "#e0573f", "#e05f9a", "#0e9aa7", "#5b6470"];
const settingsKey = `planner-settings:${boardId}`;
const backupPrefix = `planner-backup:${boardId}:`;
const DEFAULT_SETTINGS = {
  accent: "", weekStart: 1, hour12: true, defaultRemind: -1,
  defaultList: "", weekStartHour: 6, weekEndHour: 23,
  lock: true, lockCode: "0800",
};
const unlockedKey = `planner-unlocked:${boardId}`;

// Smart (built-in) lists — dynamic views over all tasks.
const SMART_LISTS = [
  { id: "smart:next7", name: "Next 7 days", icon: "i-calendar" },
  { id: "smart:overdue", name: "Overdue", icon: "i-today" },
  { id: "smart:high", name: "Priority", icon: "i-flag" },
  { id: "smart:nodate", name: "No date", icon: "i-inbox" },
  { id: "smart:all", name: "All", icon: "i-list" },
];

/* -------------------- Elements -------------------- */
const $ = (sel) => document.querySelector(sel);
const headerTitle = $("#header-title");
const headerEyebrow = $("#header-eyebrow");
const syncStatus = $("#sync-status");
const themeToggle = $("#theme-toggle");
const notifyToggle = $("#notify-toggle");
const toast = $("#toast");
const fab = $("#fab");

const views = { today: $("#view-today"), week: $("#view-week"), month: $("#view-month"), lists: $("#view-lists") };
const tabs = document.querySelectorAll(".tab");

const todayGroups = $("#today-groups");
const todayEmpty = $("#today-empty");
const todayProgress = $("#today-progress");
const progressFill = todayProgress.querySelector(".progress-fill");
const progressLabel = todayProgress.querySelector(".progress-label");
const focusCard = $("#focus-card");

const weekPrev = $("#week-prev");
const weekNext = $("#week-next");
const weekTodayBtn = $("#week-today");
const weekAllday = $("#week-allday");
const weekGrid = $("#week-grid");

const listsTabs = $("#lists-tabs");
const addListButton = $("#add-list");
const renameListButton = $("#rename-list");
const listTitle = $("#list-title");
const clearDoneButton = $("#clear-done");
const filterButtons = document.querySelectorAll(".filter");
const filterPill = $(".filter-pill");
const taskListEl = $("#task-list");
const listsEmpty = $("#lists-empty");
const emptyAction = $("#empty-action");

const shareButton = $("#share-button");
const installButton = $("#install-button");
const moreToggle = $("#more-toggle");
const moreMenu = $("#more-menu");

/* Search */
const searchToggle = $("#search-toggle");
const searchDialog = $("#search-dialog");
const searchInput = $("#search-input");
const searchClose = $("#search-close");
const searchResults = $("#search-results");
const searchEmpty = $("#search-empty");

/* Settings */
const settingsButton = $("#settings-button");
const settingsDialog = $("#settings-dialog");
const settingsClose = $("#settings-close");
const accentPicker = $("#accent-picker");
const setTheme = $("#set-theme");
const setWeekstart = $("#set-weekstart");
const setTimeformat = $("#set-timeformat");
const setRemind = $("#set-remind");
const setDefaultlist = $("#set-defaultlist");
const setWeekstarthour = $("#set-weekstarthour");
const setWeekendhour = $("#set-weekendhour");
const exportJsonBtn = $("#export-json");
const exportCsvBtn = $("#export-csv");
const exportIcsBtn = $("#export-ics");
const importJsonBtn = $("#import-json");
const importFile = $("#import-file");
const backupStatus = $("#backup-status");

/* Subtasks (in task editor) */
const subtaskList = $("#subtask-list");
const subtaskInput = $("#subtask-input");
const subtaskAddBtn = $("#subtask-add-btn");

/* Month view */
const monthPrev = $("#month-prev");
const monthNext = $("#month-next");
const monthTodayBtn = $("#month-today");
const monthWeekdays = $("#month-weekdays");
const monthGrid = $("#month-grid");
const monthDay = $("#month-day");

/* New templates */
const subtaskTemplate = $("#subtask-template");
const monthCellTemplate = $("#month-cell-template");

/* Passcode lock */
const lockScreen = $("#lock-screen");
const lockInner = lockScreen.querySelector(".lock-inner");
const lockDots = $("#lock-dots");
const lockKeypad = $("#lock-keypad");
const setLock = $("#set-lock");
const setLockcode = $("#set-lockcode");

/* Task dialog */
const taskDialog = $("#task-dialog");
const taskForm = $("#task-form");
const taskDialogTitle = $("#task-dialog-title");
const taskTitleInput = $("#task-title");
const taskListSelect = $("#task-list-select");
const taskPriority = $("#task-priority");
const taskDate = $("#task-date");
const taskTime = $("#task-time");
const taskDuration = $("#task-duration");
const taskRepeat = $("#task-repeat");
const taskRemind = $("#task-remind");
const taskNotes = $("#task-notes");
const taskDeleteBtn = $("#task-delete");
const taskCancelBtn = $("#task-cancel");

/* Quick-add dialog */
const quickDialog = $("#quick-dialog");
const quickForm = $("#quick-form");
const quickInput = $("#quick-input");
const quickPreview = $("#quick-preview");
const quickMoreBtn = $("#quick-more");
const quickCancelBtn = $("#quick-cancel");
const quickSuggestions = document.querySelector(".quick-suggestions");
const quickAdded = $("#quick-added");
const snoozeRow = $("#snooze-row");

/* List dialog */
const listDialog = $("#list-dialog");
const listForm = $("#list-form");
const listDialogTitle = $("#list-dialog-title");
const listNameInput = $("#list-name-input");
const colorPicker = $("#color-picker");
const listDeleteBtn = $("#list-delete");
const listCancelBtn = $("#list-cancel");

/* Templates */
const taskTemplate = $("#task-template");
const listTabTemplate = $("#list-tab-template");
const weekBlockTemplate = $("#week-block-template");
const todayGroupTemplate = $("#today-group-template");

/* -------------------- State -------------------- */
let settings = loadSettings(); // must precede anything that reads it (e.g. startOfWeek)
let lists = loadLists();
let tasks = loadTasks();
let activeListId = localStorage.getItem(activeKey) || lists[0]?.id || null;
let activeFilter = "all";
let currentView = "today";
let weekAnchor = startOfWeek(new Date()); // Monday of shown week
let online = null;
let knownIds = new Set(tasks.map((t) => t.id));
let installPrompt = null;
let toastTimer = null;
let taskDialogMode = "create";
let editingTaskId = null;
let listDialogMode = "create";
let editingListId = null;
let pendingColor = LIST_COLORS[0];
let notified = new Set(readJSON(notifiedKey, []));
let editingSubtasks = [];
let monthAnchor = startOfMonth(new Date());
let selectedDay = todayStr();

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Storage helpers
   ============================================================ */
function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function loadLists() { return readJSON(listsKey, []); }
function saveLists() { localStorage.setItem(listsKey, JSON.stringify(lists)); }
function loadTasks() { return readJSON(tasksKey, []); }
function saveTasks() { localStorage.setItem(tasksKey, JSON.stringify(tasks)); }
function loadSettings() { return { ...DEFAULT_SETTINGS, ...readJSON(settingsKey, {}) }; }
function saveSettings() { localStorage.setItem(settingsKey, JSON.stringify(settings)); }
function saveNotified() { localStorage.setItem(notifiedKey, JSON.stringify([...notified].slice(-200))); }

function getBoardId() {
  const url = new URL(window.location.href);
  let rawId = url.searchParams.get("board");
  if (!rawId) rawId = localStorage.getItem(boardIdKey) || crypto.randomUUID();
  const cleanId = rawId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  localStorage.setItem(boardIdKey, cleanId);
  if (url.searchParams.get("board") !== cleanId) {
    url.searchParams.set("board", cleanId);
    window.history.replaceState({}, "", url);
  }
  return cleanId;
}

function activeList() { return lists.find((l) => l.id === activeListId) || null; }
function listById(id) { return lists.find((l) => l.id === id) || null; }
function colorForList(id) { return listById(id)?.color || "var(--accent)"; }

/* ============================================================
   Date helpers (local time, YYYY-MM-DD strings)
   ============================================================ */
function pad(n) { return String(n).padStart(2, "0"); }
function ymd(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function todayStr() { return ymd(new Date()); }
function parseYMD(str) { const [y, m, d] = str.split("-").map(Number); return new Date(y, m - 1, d); }

function startOfWeek(date) {
  const d = new Date(date);
  const ws = settings ? settings.weekStart : 1;
  const day = (d.getDay() - ws + 7) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(date) { const d = new Date(date); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function addMonths(date, n) { const d = new Date(date); d.setMonth(d.getMonth() + n); return d; }

function taskDateTime(task) {
  if (!task.dueDate) return null;
  const d = parseYMD(task.dueDate);
  if (task.time) { const [h, m] = task.time.split(":").map(Number); d.setHours(h, m, 0, 0); }
  else d.setHours(23, 59, 59, 999);
  return d;
}

function relativeDayLabel(dateStr) {
  const today = todayStr();
  if (dateStr === today) return "Today";
  if (dateStr === ymd(addDays(new Date(), 1))) return "Tomorrow";
  if (dateStr === ymd(addDays(new Date(), -1))) return "Yesterday";
  const d = parseYMD(dateStr);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: settings ? settings.hour12 : true });
}
function hhmm(date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }

/* Short relative countdown for a task's due datetime, e.g. "in 25m", "2h ago". */
function relTime(task) {
  const at = taskDateTime(task);
  if (!at || !task.time) return "";
  let diff = Math.round((at.getTime() - Date.now()) / 60000); // minutes
  const past = diff < 0;
  diff = Math.abs(diff);
  if (diff < 1) return "now";
  let label;
  if (diff < 60) label = `${diff}m`;
  else if (diff < 1440) { const h = Math.floor(diff / 60), m = diff % 60; label = m ? `${h}h ${m}m` : `${h}h`; }
  else return "";
  return past ? `${label} ago` : `in ${label}`;
}

/* ============================================================
   Theme
   ============================================================ */
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme) {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  // Keep the browser/PWA status-bar tint in sync with the active theme.
  let meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  meta.content = resolved === "dark" ? "#131419" : "#f6f2e9";
}
function currentTheme() {
  return localStorage.getItem(themeKey) || (darkQuery.matches ? "dark" : "light");
}
// Resolve on boot so the OS preference is honored even before any toggle.
applyTheme(currentTheme());
// Follow the OS while the user hasn't picked an explicit preference.
darkQuery.addEventListener("change", (e) => {
  if (!localStorage.getItem(themeKey)) applyTheme(e.matches ? "dark" : "light");
});
themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(themeKey, next);
  applyTheme(next);
  buzz(8);
});

/* ============================================================
   Settings — apply preferences across the app
   ============================================================ */
function applySettings() {
  const root = document.documentElement;
  if (settings.accent) {
    root.style.setProperty("--accent", settings.accent);
    root.style.setProperty("--accent-text", "#ffffff");
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-text");
  }
  WEEK_START_HOUR = settings.weekStartHour;
  WEEK_END_HOUR = settings.weekEndHour;
}
applySettings();

/* ============================================================
   Small helpers
   ============================================================ */
function buzz(ms) { if (!prefersReducedMotion && navigator.vibrate) navigator.vibrate(ms); }

function setSyncStatus(message, state = "") {
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

function showToast(message, actionLabel, onAction) {
  clearTimeout(toastTimer);
  toast.replaceChildren(document.createTextNode(message));
  if (actionLabel && onAction) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", () => { hideToast(); onAction(); });
    toast.append(button);
  }
  toast.classList.add("show");
  toastTimer = setTimeout(hideToast, 4200);
}
function hideToast() { toast.classList.remove("show"); }

/* ============================================================
   View switching
   ============================================================ */
const VIEW_TITLES = {
  today: { eyebrow: "Let's plan", title: "Today" },
  week: { eyebrow: "Your schedule", title: "This week" },
  month: { eyebrow: "Your schedule", title: "This month" },
  lists: { eyebrow: "Organize", title: "Lists" },
};

function setView(view) {
  currentView = view;
  Object.entries(views).forEach(([name, el]) => el.classList.toggle("hidden", name !== view));
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === view));
  headerEyebrow.textContent = VIEW_TITLES[view].eyebrow;
  headerTitle.textContent = VIEW_TITLES[view].title;
  renderCurrent();
}

function renderCurrent() {
  if (currentView === "today") renderToday();
  else if (currentView === "week") renderWeek();
  else if (currentView === "month") renderMonth();
  else renderLists();
}

tabs.forEach((tab) => tab.addEventListener("click", () => { buzz(6); setView(tab.dataset.tab); }));

/* ============================================================
   Render: Today view
   ============================================================ */
function renderToday() {
  const today = todayStr();
  const active = tasks.filter((t) => !t.done);

  const overdue = active
    .filter((t) => t.dueDate && t.dueDate < today)
    .sort(byDateTime);
  const dueToday = active
    .filter((t) => t.dueDate === today)
    .sort(byTimePriority);
  const noDate = active
    .filter((t) => !t.dueDate)
    .sort(byPriority);

  todayGroups.replaceChildren();
  let animIndex = 0;

  const addGroup = (label, arr, cls = "") => {
    if (arr.length === 0) return;
    const group = todayGroupTemplate.content.firstElementChild.cloneNode(true);
    if (cls) group.classList.add(cls);
    const title = group.querySelector(".group-title");
    title.textContent = label;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = arr.length;
    title.append(count);
    const ul = group.querySelector(".task-list");
    arr.forEach((task) => ul.append(buildTaskItem(task, animIndex++, true)));
    todayGroups.append(group);
  };

  addGroup("Overdue", overdue, "overdue");
  addGroup("Today", dueToday);
  addGroup("Anytime", noDate);

  knownIds = new Set(tasks.map((t) => t.id));
  const isEmpty = overdue.length + dueToday.length + noDate.length === 0;
  todayEmpty.classList.toggle("hidden", !isEmpty);

  renderTodayProgress();
  renderFocusCard(overdue, dueToday, noDate);
}

/* Gentle progress bar: how many of today's tasks are done. */
function renderTodayProgress() {
  const today = todayStr();
  const todays = tasks.filter((t) => t.dueDate === today);
  const done = todays.filter((t) => t.done).length;
  if (todays.length === 0) { todayProgress.classList.add("hidden"); return; }
  todayProgress.classList.remove("hidden");
  const pct = Math.round((done / todays.length) * 100);
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = done === todays.length ? "All done 🎉" : `${done} of ${todays.length} done`;
}

/* "Right now" focus card: surfaces the single next thing to do. */
function renderFocusCard(overdue, dueToday, noDate) {
  // Pick the most pressing not-done task: overdue (earliest), else next timed
  // today, else highest-priority today/anytime.
  const timedToday = dueToday.filter((t) => t.time).sort(byTimePriority);
  const next = overdue[0] || timedToday[0] || dueToday.sort(byPriority)[0] || noDate.sort(byPriority)[0];
  if (!next) { focusCard.classList.add("hidden"); focusCard.replaceChildren(); return; }

  focusCard.classList.remove("hidden");
  const when = [];
  if (next.dueDate && next.dueDate < todayStr()) when.push("Overdue");
  else if (next.dueDate) when.push(relativeDayLabel(next.dueDate));
  if (next.time) when.push(fmtTime(next.time));
  const rel = relTime(next);
  if (rel) when.push(rel);

  focusCard.replaceChildren();
  const eyebrow = document.createElement("p");
  eyebrow.className = "focus-eyebrow";
  eyebrow.textContent = "▸ Right now";
  const title = document.createElement("p");
  title.className = "focus-title";
  title.textContent = next.title;
  title.addEventListener("click", () => openTaskDialog("edit", next.id));
  focusCard.append(eyebrow, title);
  if (when.length) {
    const w = document.createElement("p");
    w.className = "focus-when";
    w.textContent = when.join(" · ");
    focusCard.append(w);
  }
  const actions = document.createElement("div");
  actions.className = "focus-actions";
  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "focus-btn focus-done";
  doneBtn.textContent = "✓ Done";
  doneBtn.addEventListener("click", () => toggleTask(next.id));
  const snoozeBtn = document.createElement("button");
  snoozeBtn.type = "button";
  snoozeBtn.className = "focus-btn focus-snooze";
  snoozeBtn.textContent = "Snooze 1h";
  snoozeBtn.addEventListener("click", () => snoozeTask(next.id, "1h"));
  actions.append(doneBtn, snoozeBtn);
  focusCard.append(actions);
}

function byDateTime(a, b) { return (taskDateTime(a)?.getTime() || 0) - (taskDateTime(b)?.getTime() || 0); }
function byTimePriority(a, b) {
  const ta = a.time || "99:99", tb = b.time || "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return priorityRank(b) - priorityRank(a);
}
function byPriority(a, b) { return priorityRank(b) - priorityRank(a); }
function priorityRank(t) { return { high: 3, med: 2, low: 1 }[t.priority] || 0; }

/* ============================================================
   Render: a single task <li>
   ============================================================ */
function buildTaskItem(task, animIndex, animate) {
  const li = taskTemplate.content.firstElementChild.cloneNode(true);
  const surface = li.querySelector(".task-surface");

  li.dataset.id = task.id;
  li.classList.toggle("done", !!task.done);
  surface.dataset.priority = task.priority || "med";

  li.querySelector(".task-title").textContent = task.title;
  li.querySelector(".task-dot").style.setProperty("--list-color", colorForList(task.listId));

  /* meta line: priority flag · list · date/time · countdown · repeat · reminder */
  const meta = li.querySelector(".task-meta");
  meta.replaceChildren();
  if (task.priority === "high" && !task.done) meta.append(chip("", "i-flag", "flag-chip"));
  const list = listById(task.listId);
  if (list) meta.append(chip(list.name));
  if (task.dueDate) {
    const overdue = !task.done && task.dueDate < todayStr();
    const label = relativeDayLabel(task.dueDate) + (task.time ? ` · ${fmtTime(task.time)}` : "");
    meta.append(chip(label, "i-today", overdue ? "overdue-tag" : ""));
    if (!task.done && task.dueDate === todayStr() && task.time) {
      const rel = relTime(task);
      if (rel) meta.append(chip(rel, "", "soon-tag"));
    }
  }
  if (task.repeat) meta.append(chip("", "i-repeat"));
  if (Number(task.remindMin) >= 0 && task.dueDate) meta.append(chip("", "i-bell"));
  if (Array.isArray(task.subtasks) && task.subtasks.length) {
    const done = task.subtasks.filter((s) => s.done).length;
    meta.append(chip(`${done}/${task.subtasks.length}`, "i-check", "steps-chip"));
  }
  if (task.notes) meta.append(chip("…"));

  li.querySelector(".check-button").setAttribute("aria-label", task.done ? "Mark not done" : "Mark done");

  if (animate && !knownIds.has(task.id) && !prefersReducedMotion) {
    li.classList.add("entering");
    li.style.setProperty("--i", animIndex);
    li.addEventListener("animationend", () => li.classList.remove("entering"), { once: true });
  }
  return li;
}

function chip(text, iconId, extraClass = "") {
  const span = document.createElement("span");
  span.className = "chip" + (extraClass ? " " + extraClass : "");
  if (iconId) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + iconId);
    svg.append(use);
    span.append(svg);
  }
  if (text) span.append(document.createTextNode(text));
  return span;
}

/* ============================================================
   Render: Week view
   ============================================================ */
let weekDays = [];
function renderWeek() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
  weekDays = days;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  /* Header label */
  const first = days[0], last = days[6];
  const sameMonth = first.getMonth() === last.getMonth();
  const fmt = (d, withMonth) => d.toLocaleDateString(undefined, { month: withMonth ? "short" : undefined, day: "numeric" });
  weekTodayBtn.textContent = startOfWeek(today).getTime() === weekAnchor.getTime()
    ? "This week"
    : `${fmt(first, true)} – ${fmt(last, !sameMonth)}`;

  // A timed task only fits the grid if its hour is within the visible range;
  // otherwise it shows as an all-day chip so it's never lost.
  const inGrid = (t) => {
    if (!t.time) return false;
    const h = Number(t.time.split(":")[0]);
    return h >= WEEK_START_HOUR && h <= WEEK_END_HOUR;
  };

  /* All-day tasks + any timed task outside the visible hours */
  weekAllday.replaceChildren();
  days.forEach((day) => {
    const ds = ymd(day);
    const dayTasks = tasks.filter((t) => t.dueDate === ds && !inGrid(t));
    if (dayTasks.length === 0) return;
    const row = document.createElement("div");
    row.className = "allday-row";
    const label = document.createElement("span");
    label.className = "allday-day";
    label.textContent = day.toLocaleDateString(undefined, { weekday: "short" });
    const chips = document.createElement("div");
    chips.className = "allday-chips";
    dayTasks.forEach((t) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "allday-chip" + (t.done ? " done" : "");
      c.textContent = (t.time ? fmtTime(t.time) + " " : "") + t.title;
      c.style.setProperty("--list-color", colorForList(t.listId));
      c.dataset.id = t.id;
      c.addEventListener("click", () => openTaskDialog("edit", t.id));
      chips.append(c);
    });
    row.append(label, chips);
    weekAllday.append(row);
  });

  /* Grid: corner + 7 day heads, then hour rows */
  weekGrid.replaceChildren();
  weekGrid.append(cell("week-corner"));
  days.forEach((day) => {
    const head = document.createElement("div");
    head.className = "week-dayhead" + (day.getTime() === today.getTime() ? " is-today" : "");
    head.innerHTML = `${day.toLocaleDateString(undefined, { weekday: "short" })}<span class="dnum">${day.getDate()}</span>`;
    weekGrid.append(head);
  });

  for (let hour = WEEK_START_HOUR; hour <= WEEK_END_HOUR; hour++) {
    const hourCell = document.createElement("div");
    hourCell.className = "week-hour";
    const d = new Date(); d.setHours(hour, 0);
    hourCell.textContent = d.toLocaleTimeString(undefined, { hour: "numeric" }).replace(" ", "");
    weekGrid.append(hourCell);

    days.forEach((day) => {
      const c = document.createElement("div");
      c.className = "week-cell" + (day.getTime() === today.getTime() ? " is-today" : "");
      c.dataset.date = ymd(day);
      c.dataset.hour = hour;
      weekGrid.append(c);
    });
  }

  /* Place timed task blocks (only those within the visible hours).
     Measure geometry once — robust to font scaling (Dynamic Type) and avoids
     per-block layout thrashing. */
  const hourHeight = 44;
  const labelW = 44;
  const gridWidth = weekGrid.getBoundingClientRect().width;
  const colW = (gridWidth - labelW) / 7;
  const headerH = weekGrid.querySelector(".week-dayhead")?.offsetHeight || 44;
  days.forEach((day, di) => {
    const ds = ymd(day);
    tasks.filter((t) => t.dueDate === ds && inGrid(t)).forEach((t) => {
      const [h, m] = t.time.split(":").map(Number);
      const block = weekBlockTemplate.content.firstElementChild.cloneNode(true);
      block.classList.toggle("done", !!t.done);
      block.style.setProperty("--list-color", colorForList(t.listId));
      block.dataset.id = t.id;
      const topOffset = (h - WEEK_START_HOUR) * hourHeight + (m / 60) * hourHeight;
      const dur = Number(t.durationMin) || 30;
      block.style.left = `${labelW + di * colW + 2}px`;
      block.style.width = `${colW - 4}px`;
      block.style.top = `${headerH + topOffset + 1}px`;
      block.style.height = `${Math.max(18, (dur / 60) * hourHeight - 2)}px`;
      const bt = document.createElement("span");
      bt.className = "bt";
      bt.textContent = fmtTime(t.time);
      block.append(bt, document.createTextNode(t.title));
      const handle = document.createElement("div");
      handle.className = "resize-handle";
      block.append(handle);
      // Tap = edit; long-press = drag (handled by the unified pointer logic).
      weekGrid.append(block);
    });
  });
}

function cell(cls) { const d = document.createElement("div"); d.className = cls; return d; }

weekPrev.addEventListener("click", () => { weekAnchor = addDays(weekAnchor, -7); buzz(6); renderWeek(); });
weekNext.addEventListener("click", () => { weekAnchor = addDays(weekAnchor, 7); buzz(6); renderWeek(); });
weekTodayBtn.addEventListener("click", () => { weekAnchor = startOfWeek(new Date()); buzz(6); renderWeek(); });

/* Tap an empty grid cell to add a task at that day/time */
weekGrid.addEventListener("click", (event) => {
  const c = event.target.closest(".week-cell");
  if (!c) return;
  openTaskDialog("create", null, { date: c.dataset.date, time: `${pad(Number(c.dataset.hour))}:00` });
});

/* -------------------- Drag-to-schedule & resize (touch) -------------------- */
let wdrag = null;
let weekHint = null;
const HOUR_PX = 44;

function weekGeom() {
  const r = weekGrid.getBoundingClientRect();
  const labelW = 44;
  const headerH = weekGrid.querySelector(".week-dayhead")?.offsetHeight || 44;
  return { r, labelW, headerH, colW: (r.width - labelW) / 7 };
}
function showWeekHint(text) {
  if (!weekHint) {
    weekHint = document.createElement("div");
    weekHint.className = "week-drag-hint";
    document.body.append(weekHint);
  }
  weekHint.textContent = text;
  weekHint.classList.add("show");
}
function hideWeekHint() { if (weekHint) weekHint.classList.remove("show"); }
function clearDropTargets() { weekGrid.querySelectorAll(".week-cell.drop-target").forEach((c) => c.classList.remove("drop-target")); }

function posToSlot(clientX, clientY) {
  const g = weekGeom();
  let di = Math.floor((clientX - g.r.left - g.labelW) / g.colW);
  di = Math.max(0, Math.min(6, di));
  let mins = Math.round(((clientY - g.r.top - g.headerH) / HOUR_PX) * 60 / 15) * 15;
  const span = (WEEK_END_HOUR - WEEK_START_HOUR + 1) * 60;
  mins = Math.max(0, Math.min(span - 15, mins));
  return { di, mins, g };
}

weekGrid.addEventListener("pointerdown", (event) => {
  const block = event.target.closest(".week-block");
  if (!block) return;
  const id = block.dataset.id;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  if (event.target.closest(".resize-handle")) {
    wdrag = { mode: "resize", block, id, dur: Number(task.durationMin) || 30, pointerId: event.pointerId };
    try { block.setPointerCapture(event.pointerId); } catch {}
    block.classList.add("dragging");
    event.preventDefault();
    return;
  }
  wdrag = { mode: "pending", block, id, startX: event.clientX, startY: event.clientY, pointerId: event.pointerId };
  try { block.setPointerCapture(event.pointerId); } catch {}
  wdrag.timer = setTimeout(() => { if (wdrag && wdrag.mode === "pending") beginWeekMove(); }, 180);
});

function beginWeekMove() {
  if (!wdrag) return;
  wdrag.mode = "move";
  wdrag.moved = true;
  wdrag.block.classList.add("dragging");
  buzz(12);
}

weekGrid.addEventListener("pointermove", (event) => {
  if (!wdrag) return;
  if (wdrag.mode === "pending") {
    if (Math.hypot(event.clientX - wdrag.startX, event.clientY - wdrag.startY) > 10) {
      clearTimeout(wdrag.timer);
      beginWeekMove();
    } else return;
  }
  if (wdrag.mode === "move") {
    const { di, mins, g } = posToSlot(event.clientX, event.clientY);
    wdrag.di = di; wdrag.mins = mins;
    wdrag.block.style.left = `${g.labelW + di * g.colW + 2}px`;
    wdrag.block.style.top = `${g.headerH + (mins / 60) * HOUR_PX + 1}px`;
    const total = WEEK_START_HOUR * 60 + mins;
    const date = ymd(weekDays[di]);
    clearDropTargets();
    const cell = weekGrid.querySelector(`.week-cell[data-date="${date}"][data-hour="${Math.floor(total / 60)}"]`);
    if (cell) cell.classList.add("drop-target");
    showWeekHint(`${weekDays[di].toLocaleDateString(undefined, { weekday: "short" })} · ${fmtTime(pad(Math.floor(total / 60)) + ":" + pad(total % 60))}`);
  } else if (wdrag.mode === "resize") {
    const g = weekGeom();
    const top = parseFloat(wdrag.block.style.top) || 0;
    let dur = Math.round(((event.clientY - g.r.top - top) / HOUR_PX) * 60 / 15) * 15;
    dur = Math.max(15, Math.min(600, dur));
    wdrag.dur = dur;
    wdrag.block.style.height = `${Math.max(18, (dur / 60) * HOUR_PX - 2)}px`;
    showWeekHint(`${dur} min`);
  }
});

function endWeekDrag() {
  if (!wdrag) return;
  const d = wdrag;
  wdrag = null;
  clearTimeout(d.timer);
  try { d.block.releasePointerCapture(d.pointerId); } catch {}
  hideWeekHint();
  clearDropTargets();
  d.block.classList.remove("dragging");
  if (d.mode === "pending") { openTaskDialog("edit", d.id); return; }
  if (d.mode === "move") {
    const total = WEEK_START_HOUR * 60 + d.mins;
    const time = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
    updateTask(d.id, { dueDate: ymd(weekDays[d.di]), time });
    buzz(8);
  } else if (d.mode === "resize") {
    updateTask(d.id, { durationMin: d.dur });
    buzz(8);
  }
}
weekGrid.addEventListener("pointerup", endWeekDrag);
weekGrid.addEventListener("pointercancel", () => { if (wdrag) { clearTimeout(wdrag.timer); const b = wdrag.block; wdrag = null; hideWeekHint(); clearDropTargets(); b.classList.remove("dragging"); renderWeek(); } });

/* ============================================================
   Render: Month view
   ============================================================ */
function renderMonth() {
  const monthName = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isThisMonth = startOfMonth(new Date()).getTime() === monthAnchor.getTime();
  monthTodayBtn.textContent = isThisMonth ? "This month" : monthName;
  headerTitle.textContent = isThisMonth ? "This month" : monthName;

  // Weekday header respecting week-start preference.
  monthWeekdays.replaceChildren();
  const refMon = startOfWeek(new Date());
  for (let i = 0; i < 7; i++) {
    const span = document.createElement("span");
    span.textContent = addDays(refMon, i).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    monthWeekdays.append(span);
  }

  const gridStart = startOfWeek(startOfMonth(monthAnchor));
  const today = todayStr();
  const month = monthAnchor.getMonth();

  monthGrid.replaceChildren();
  for (let i = 0; i < 42; i++) {
    const day = addDays(gridStart, i);
    const ds = ymd(day);
    const cell = monthCellTemplate.content.firstElementChild.cloneNode(true);
    cell.dataset.date = ds;
    if (day.getMonth() !== month) cell.classList.add("other-month");
    if (ds === today) cell.classList.add("is-today");
    if (ds === selectedDay) cell.classList.add("selected");
    cell.querySelector(".mc-date").textContent = day.getDate();

    const dayTasks = tasks.filter((t) => t.dueDate === ds);
    const dots = cell.querySelector(".mc-dots");
    dayTasks.slice(0, 4).forEach((t) => {
      const i2 = document.createElement("i");
      i2.style.setProperty("--dot", t.done ? "var(--text-faint)" : colorForList(t.listId));
      dots.append(i2);
    });
    if (dayTasks.length > 4) {
      const more = document.createElement("span");
      more.className = "mc-more";
      more.textContent = `+${dayTasks.length - 4}`;
      dots.append(more);
    }
    monthGrid.append(cell);
  }
  renderMonthDay();
}

function renderMonthDay() {
  monthDay.replaceChildren();
  const head = document.createElement("div");
  head.className = "month-day-head";
  const h = document.createElement("h3");
  h.textContent = relativeDayLabel(selectedDay);
  const add = document.createElement("button");
  add.className = "icon-text-button";
  add.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-plus" /></svg><span>Add</span>`;
  add.addEventListener("click", () => openTaskDialog("create", null, { date: selectedDay }));
  head.append(h, add);
  monthDay.append(head);

  const dayTasks = tasks
    .filter((t) => t.dueDate === selectedDay)
    .sort((a, b) => (!!a.done !== !!b.done ? (a.done ? 1 : -1) : byTimePriority(a, b)));
  const ul = document.createElement("ul");
  ul.className = "task-list";
  if (dayTasks.length === 0) {
    const p = document.createElement("p");
    p.className = "search-empty";
    p.style.marginTop = "8px";
    p.textContent = "Nothing planned. Tap Add to plan something.";
    monthDay.append(p);
  } else {
    let i = 0;
    dayTasks.forEach((t) => ul.append(buildTaskItem(t, i++, false)));
    monthDay.append(ul);
  }
  knownIds = new Set(tasks.map((t) => t.id));
}

monthGrid.addEventListener("click", (event) => {
  const cell = event.target.closest(".month-cell");
  if (!cell) return;
  selectedDay = cell.dataset.date;
  buzz(5);
  renderMonth();
});
attachSwipe(monthDay);

monthPrev.addEventListener("click", () => { monthAnchor = addMonths(monthAnchor, -1); buzz(6); renderMonth(); });
monthNext.addEventListener("click", () => { monthAnchor = addMonths(monthAnchor, 1); buzz(6); renderMonth(); });
monthTodayBtn.addEventListener("click", () => { monthAnchor = startOfMonth(new Date()); selectedDay = todayStr(); buzz(6); renderMonth(); });

/* ============================================================
   Render: Lists view
   ============================================================ */
function smartFilter(id) {
  const today = todayStr();
  const in7 = ymd(addDays(new Date(), 6));
  if (id === "smart:next7") return tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= in7);
  if (id === "smart:overdue") return tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today);
  if (id === "smart:high") return tasks.filter((t) => t.priority === "high");
  if (id === "smart:nodate") return tasks.filter((t) => !t.dueDate);
  if (id === "smart:all") return tasks.slice();
  return [];
}

function renderLists() {
  renderListTabs();

  const smart = isSmart(activeListId) ? SMART_LISTS.find((s) => s.id === activeListId) : null;
  const current = activeList();
  listTitle.textContent = smart ? smart.name : current ? current.name : "Your tasks";
  renameListButton.hidden = !current; // only real lists are editable
  document.body.classList.toggle("no-list", lists.length === 0 && !smart);

  const listTasks = smart
    ? smartFilter(activeListId)
    : current
      ? tasks.filter((t) => t.listId === activeListId)
      : tasks.filter((t) => !t.listId || !listById(t.listId));

  let visible = listTasks;
  if (activeFilter === "active") visible = listTasks.filter((t) => !t.done);
  else if (activeFilter === "done") visible = listTasks.filter((t) => t.done);
  visible = [...visible].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return byDateTime(a, b) || (b.createdAt - a.createdAt);
  });

  const fragment = document.createDocumentFragment();
  let i = 0;
  visible.forEach((task) => fragment.append(buildTaskItem(task, i++, true)));
  taskListEl.replaceChildren(fragment);
  knownIds = new Set(tasks.map((t) => t.id));

  clearDoneButton.disabled = !listTasks.some((t) => t.done);

  const isEmpty = visible.length === 0;
  listsEmpty.classList.toggle("hidden", !isEmpty);
  if (isEmpty) {
    const h3 = listsEmpty.querySelector("h3");
    const p = listsEmpty.querySelector("p");
    if (smart) {
      h3.textContent = "Nothing here";
      p.textContent = "No tasks match this view right now.";
      emptyAction.hidden = true;
    } else if (lists.length === 0) {
      h3.textContent = "No lists yet";
      p.textContent = "Create a list to organize your tasks.";
      emptyAction.hidden = false;
    } else if (listTasks.length === 0) {
      h3.textContent = "This list is empty";
      p.textContent = "Tap + to add your first task here.";
      emptyAction.hidden = true;
    } else {
      h3.textContent = "Nothing here";
      p.textContent = "Try another filter.";
      emptyAction.hidden = true;
    }
  }
  moveFilterPill();
}

function renderListTabs() {
  const prevScroll = listsTabs.scrollLeft;
  listsTabs.replaceChildren();
  // Built-in smart lists first.
  SMART_LISTS.forEach((s) => {
    const tab = listTabTemplate.content.firstElementChild.cloneNode(true);
    tab.classList.add("smart");
    tab.dataset.id = s.id;
    tab.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${s.icon}" /></svg>${s.name}`;
    if (s.id === activeListId) tab.setAttribute("aria-current", "true");
    listsTabs.append(tab);
  });
  if (lists.length) {
    const divider = document.createElement("span");
    divider.className = "lists-divider";
    divider.setAttribute("aria-hidden", "true");
    listsTabs.append(divider);
  }
  // User lists.
  lists.forEach((list) => {
    const tab = listTabTemplate.content.firstElementChild.cloneNode(true);
    tab.textContent = list.name;
    tab.dataset.id = list.id;
    tab.style.setProperty("--tab-color", list.color || "var(--accent)");
    if (list.id === activeListId) tab.setAttribute("aria-current", "true");
    listsTabs.append(tab);
  });
  // Preserve horizontal scroll across re-renders (don't yank the smart lists
  // off-screen by forcing the active tab into view).
  listsTabs.scrollLeft = prevScroll;
}

function moveFilterPill() {
  const active = document.querySelector(".filter.active");
  if (!active || views.lists.classList.contains("hidden")) return;
  filterPill.style.width = `${active.offsetWidth}px`;
  filterPill.style.transform = `translateX(${active.offsetLeft - 5}px)`;
}

function setActiveList(id) {
  activeListId = id;
  if (id) localStorage.setItem(activeKey, id);
  else localStorage.removeItem(activeKey);
  knownIds = new Set();
  renderLists();
}

/* ============================================================
   Firebase
   ============================================================ */
function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every((v) => v && !v.startsWith("PASTE_"));
}
function listsCol() { return online.fb.collection(online.db, "boards", boardId, "lists"); }
function tasksCol() { return online.fb.collection(online.db, "boards", boardId, "tasks"); }

async function connectToFirebase() {
  if (!isFirebaseConfigured()) { setSyncStatus("Saved on this device"); return; }
  setSyncStatus("Connecting…", "pending");
  try {
    const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app.js`);
    const fb = await import(`https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-firestore.js`);
    const app = initializeApp(firebaseConfig);
    const db = fb.getFirestore(app);
    online = { fb, db };
    refreshPushOnLaunch(); // keep this device's push subscription current

    fb.onSnapshot(fb.query(listsCol(), fb.orderBy("createdAt", "asc")), (snap) => {
      lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      saveLists();
      // Ensure a sensible active list once lists arrive (covers first-run where
      // activeListId is null). Preserve smart-list selections.
      if (lists.length && !isSmart(activeListId) && (!activeListId || !lists.some((l) => l.id === activeListId))) {
        activeListId = lists[0].id;
      }
      if (activeListId) localStorage.setItem(activeKey, activeListId);
      ensureTaskListOptions();
      renderCurrent();
      setSyncStatus("Synced · Live", "online");
    }, () => setSyncStatus("Cannot sync · Check Firebase setup", "error"));

    fb.onSnapshot(fb.query(tasksCol(), fb.orderBy("createdAt", "desc")), (snap) => {
      tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      saveTasks();
      renderCurrent();
    }, () => setSyncStatus("Cannot sync · Check Firebase setup", "error"));
  } catch {
    setSyncStatus("Offline · Saved on this device", "error");
  }
}

/* ============================================================
   List CRUD
   ============================================================ */
function listFields(list) { return { name: list.name, color: list.color, createdAt: list.createdAt }; }

async function createList(name, color) {
  const list = { id: crypto.randomUUID(), name, color, createdAt: Date.now() };
  if (online) await online.fb.setDoc(online.fb.doc(listsCol(), list.id), listFields(list));
  else { lists.push(list); saveLists(); }
  setActiveList(list.id);
  ensureTaskListOptions();
  buzz(8);
}

async function updateList(id, name, color) {
  lists = lists.map((l) => (l.id === id ? { ...l, name, color } : l));
  if (online) await online.fb.updateDoc(online.fb.doc(listsCol(), id), { name, color });
  else { saveLists(); }
  ensureTaskListOptions();
  renderCurrent();
}

async function deleteList(id) {
  const remaining = lists.filter((l) => l.id !== id);
  const orphan = tasks.filter((t) => t.listId === id);
  if (online) {
    await Promise.all(orphan.map((t) => online.fb.deleteDoc(online.fb.doc(tasksCol(), t.id))));
    await online.fb.deleteDoc(online.fb.doc(listsCol(), id));
  } else {
    tasks = tasks.filter((t) => t.listId !== id);
    lists = remaining;
    saveLists(); saveTasks();
  }
  if (activeListId === id) setActiveList(remaining[0]?.id || null);
  ensureTaskListOptions();
  buzz(12);
}

/* ============================================================
   Task CRUD
   ============================================================ */
function taskFields(t) {
  const f = {
    title: t.title, notes: t.notes || "", listId: t.listId || "",
    dueDate: t.dueDate || "", time: t.time || "", durationMin: Number(t.durationMin) || 0,
    priority: t.priority || "med", done: !!t.done, remindMin: Number(t.remindMin),
    repeat: t.repeat || "", createdAt: t.createdAt,
  };
  // Only include subtasks when present so tasks without steps stay compatible
  // with rules that predate the feature.
  const subs = sanitizeSubtasks(t.subtasks);
  if (subs.length) f.subtasks = subs;
  return f;
}

function sanitizeSubtasks(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 50).map((s) => ({
    id: String(s.id || crypto.randomUUID()),
    title: String(s.title || "").slice(0, 120),
    done: !!s.done,
  })).filter((s) => s.title);
}

async function createTask(data) {
  const task = { id: crypto.randomUUID(), createdAt: Date.now(), done: false, ...data };
  if (online) await online.fb.setDoc(online.fb.doc(tasksCol(), task.id), taskFields(task));
  else { tasks.unshift(task); saveTasks(); renderCurrent(); }
  buzz(8);
  return task;
}

async function updateTask(id, patch) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
  if (online) await online.fb.updateDoc(online.fb.doc(tasksCol(), id), patch);
  else { saveTasks(); renderCurrent(); }
}

async function removeTask(id) {
  if (online) await online.fb.deleteDoc(online.fb.doc(tasksCol(), id));
  else { tasks = tasks.filter((t) => t.id !== id); saveTasks(); renderCurrent(); }
}

async function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const willBeDone = !task.done;

  /* Recurring: completing one creates the next occurrence. */
  if (willBeDone && task.repeat && task.dueDate) {
    const next = nextOccurrence(task);
    if (next) await createTask({ ...taskFields(task), done: false, dueDate: next });
  }
  await updateTask(id, { done: willBeDone });
  if (willBeDone) celebrate();
}

/* -------------------- Completion reward (dopamine!) -------------------- */
const CHEERS = ["Nice one! 🎉", "Done and dusted ✅", "Crushing it 💪", "One less thing 🙌",
  "Boom. Next! 🚀", "Look at you go ✨", "Progress! 🌟", "Yes! Keep rolling 🔥"];

function celebrate() {
  buzz([14, 40, 14]);
  showToast(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  if (prefersReducedMotion) return;
  const colors = ["#4f6df5", "#5b9a6b", "#e0a23f", "#e0573f", "#9b59d0", "#2bb1c4"];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${10 + Math.random() * 80}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--fall", `${60 + Math.random() * 35}vh`);
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 160}px`);
    piece.style.setProperty("--spin", `${360 + Math.random() * 540}deg`);
    piece.style.setProperty("--confetti-dur", `${900 + Math.random() * 600}ms`);
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    document.body.append(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

/* -------------------- Snooze (reschedule fast) -------------------- */
async function snoozeTask(id, kind) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const now = new Date();
  let dueDate = task.dueDate || todayStr();
  let time = task.time;

  if (kind === "1h") {
    const base = (task.dueDate && taskDateTime(task) > now) ? taskDateTime(task) : now;
    const d = new Date(base.getTime() + 3600000);
    dueDate = ymd(d); time = hhmm(d);
  } else if (kind === "tonight") {
    dueDate = todayStr(); time = "20:00";
    const t = new Date(); t.setHours(20, 0, 0, 0);
    if (t < now) dueDate = ymd(addDays(now, 1));
  } else if (kind === "tomorrow") {
    dueDate = ymd(addDays(now, 1)); if (!time) time = "09:00";
  } else if (kind === "week") {
    dueDate = ymd(addDays(parseYMD(dueDate), 7));
  }

  const patch = { dueDate, time, done: false };
  if (Number(task.remindMin) < 0 && time) patch.remindMin = 0;
  await updateTask(id, patch);
  buzz(10);
  showToast(`Snoozed to ${relativeDayLabel(dueDate)}${time ? " · " + fmtTime(time) : ""}`);
}

function nextOccurrence(task) {
  const d = parseYMD(task.dueDate);
  if (task.repeat === "daily") return ymd(addDays(d, 1));
  if (task.repeat === "weekly") return ymd(addDays(d, 7));
  if (task.repeat === "weekdays") {
    let n = addDays(d, 1);
    while (n.getDay() === 0 || n.getDay() === 6) n = addDays(n, 1);
    return ymd(n);
  }
  if (task.repeat === "monthly") { const n = new Date(d); n.setMonth(n.getMonth() + 1); return ymd(n); }
  return null;
}

async function deleteTaskWithUndo(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const snapshot = { ...task };
  buzz(10);
  await removeTask(id);
  showToast(`Deleted "${snapshot.title}"`, "Undo", () => {
    knownIds.delete(snapshot.id);
    createTask(taskFields(snapshot));
  });
}

/* ============================================================
   Swipe to delete (task lists)
   ============================================================ */
const SWIPE_THRESHOLD = 90;
let drag = null;

function attachSwipe(container) {
  container.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    const surface = event.target.closest(".task-surface");
    if (!surface || event.target.closest(".check-button")) return;
    const li = surface.closest(".task-item");
    drag = { li, surface, startX: event.clientX, startY: event.clientY, dx: 0, locked: null };
  }, { passive: true });

  container.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.locked === "x") drag.li.classList.add("dragging");
    }
    if (drag.locked !== "x") return;
    drag.dx = Math.min(0, dx);
    drag.surface.style.transform = `translateX(${drag.dx}px)`;
    drag.li.classList.toggle("will-delete", drag.dx < -SWIPE_THRESHOLD);
  });

  const end = () => {
    if (!drag) return;
    const { li, surface, dx, locked } = drag;
    drag = null;
    li.classList.remove("dragging");
    if (locked !== "x") return;
    if (dx < -SWIPE_THRESHOLD) {
      surface.style.transform = "translateX(-110%)";
      li.classList.add("leaving");
      li.addEventListener("animationend", () => deleteTaskWithUndo(li.dataset.id), { once: true });
    } else {
      surface.style.transform = "";
      li.classList.remove("will-delete");
    }
  };
  container.addEventListener("pointerup", end);
  container.addEventListener("pointercancel", end);

  /* Tap handling: check button toggles, body opens editor */
  container.addEventListener("click", (event) => {
    const li = event.target.closest(".task-item");
    if (!li) return;
    if (event.target.closest(".check-button")) toggleTask(li.dataset.id);
    else openTaskDialog("edit", li.dataset.id);
  });
}
attachSwipe(taskListEl);
attachSwipe(todayGroups);

/* ============================================================
   Task dialog
   ============================================================ */
function ensureTaskListOptions() {
  const prev = taskListSelect.value;
  taskListSelect.replaceChildren();
  if (lists.length === 0) {
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = "No list";
    taskListSelect.append(opt);
  }
  lists.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id; opt.textContent = l.name;
    taskListSelect.append(opt);
  });
  if (prev) taskListSelect.value = prev;
}

function openTaskDialog(mode, id = null, prefill = {}) {
  taskDialogMode = mode;
  editingTaskId = id;
  ensureTaskListOptions();

  if (mode === "edit") {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    taskDialogTitle.textContent = "Edit task";
    taskTitleInput.value = t.title;
    taskListSelect.value = t.listId || "";
    taskPriority.value = t.priority || "med";
    taskDate.value = t.dueDate || "";
    taskTime.value = t.time || "";
    taskDuration.value = String(t.durationMin || 0);
    taskRepeat.value = t.repeat || "";
    taskRemind.value = String(t.remindMin ?? -1);
    taskNotes.value = t.notes || "";
    editingSubtasks = sanitizeSubtasks(t.subtasks);
    taskDeleteBtn.hidden = false;
    snoozeRow.hidden = false;
  } else {
    taskDialogTitle.textContent = "New task";
    taskTitleInput.value = prefill.title || "";
    taskListSelect.value = prefill.listId || defaultListId();
    taskPriority.value = prefill.priority || "med";
    taskDate.value = prefill.date || "";
    taskTime.value = prefill.time || "";
    taskDuration.value = String(prefill.durationMin ?? 30);
    taskRepeat.value = prefill.repeat || "";
    taskRemind.value = String(prefill.remindMin ?? settings.defaultRemind ?? -1);
    taskNotes.value = prefill.notes || "";
    editingSubtasks = [];
    taskDeleteBtn.hidden = true;
    snoozeRow.hidden = true;
  }
  renderSubtaskEditor();
  if (subtaskInput) subtaskInput.value = "";
  taskDialog.showModal();
  taskTitleInput.focus();
}

function isSmart(id) { return typeof id === "string" && id.startsWith("smart:"); }

// The list a new task should default to (never a smart list).
function defaultListId() {
  if (settings.defaultList && lists.some((l) => l.id === settings.defaultList)) return settings.defaultList;
  if (activeListId && !isSmart(activeListId) && lists.some((l) => l.id === activeListId)) return activeListId;
  return lists[0]?.id || "";
}

/* -------------------- Subtask editor -------------------- */
function renderSubtaskEditor() {
  subtaskList.replaceChildren();
  editingSubtasks.forEach((s, i) => {
    const li = subtaskTemplate.content.firstElementChild.cloneNode(true);
    li.classList.toggle("done", !!s.done);
    li.querySelector(".subtask-text").textContent = s.title;
    li.querySelector(".subtask-check").addEventListener("click", () => {
      editingSubtasks[i].done = !editingSubtasks[i].done;
      renderSubtaskEditor();
      buzz(6);
    });
    li.querySelector(".subtask-del").addEventListener("click", () => {
      editingSubtasks.splice(i, 1);
      renderSubtaskEditor();
    });
    subtaskList.append(li);
  });
}

function addSubtaskFromInput() {
  const title = subtaskInput.value.trim();
  if (!title) return;
  editingSubtasks.push({ id: crypto.randomUUID(), title, done: false });
  subtaskInput.value = "";
  renderSubtaskEditor();
  subtaskInput.focus();
}
subtaskAddBtn.addEventListener("click", addSubtaskFromInput);
subtaskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addSubtaskFromInput(); }
});

snoozeRow.addEventListener("click", (event) => {
  const chip = event.target.closest(".snooze-chip");
  if (!chip || !editingTaskId) return;
  const id = editingTaskId;
  taskDialog.close();
  snoozeTask(id, chip.dataset.snooze);
});

emptyAction.addEventListener("click", () => openListDialog("create"));
taskCancelBtn.addEventListener("click", () => taskDialog.close());

/* ============================================================
   Quick add — natural language ("remind to call Y tomorrow 3pm")
   ============================================================ */
function parseQuickAdd(raw) {
  let text = " " + raw.replace(/\s+/g, " ").trim() + " ";
  const strip = (re) => { text = text.replace(re, " "); };
  const now = new Date();
  let dueDate = "", time = "", remindMin = -1, repeat = "", priority = "med";

  // Priority
  if (/(!!|\b(urgent|asap|important|high priority)\b)/i.test(text)) {
    priority = "high";
    strip(/!!+/g); strip(/\b(urgent|asap|important|high priority)\b/gi);
  }

  // Repeat
  if (/\b(every\s*day|daily)\b/i.test(text)) { repeat = "daily"; strip(/\b(every\s*day|daily)\b/gi); }
  else if (/\b(every\s*weekday|weekdays?)\b/i.test(text)) { repeat = "weekdays"; strip(/\b(every\s*weekday|weekdays?)\b/gi); }
  else if (/\b(every\s*week|weekly)\b/i.test(text)) { repeat = "weekly"; strip(/\b(every\s*week|weekly)\b/gi); }
  else if (/\b(every\s*month|monthly)\b/i.test(text)) { repeat = "monthly"; strip(/\b(every\s*month|monthly)\b/gi); }

  const wantsReminder = /\b(remind|reminder|remember)\b/i.test(text);

  // Relative "in N units"
  let m;
  if ((m = text.match(/\bin\s+(\d+)\s*(minutes?|mins?|m)\b/i))) {
    const d = new Date(now.getTime() + parseInt(m[1], 10) * 60000);
    dueDate = ymd(d); time = hhmm(d); remindMin = 0;
    strip(/\bin\s+\d+\s*(minutes?|mins?|m)\b/i);
  } else if ((m = text.match(/\bin\s+(\d+)\s*(hours?|hrs?|h)\b/i))) {
    const d = new Date(now.getTime() + parseInt(m[1], 10) * 3600000);
    dueDate = ymd(d); time = hhmm(d); remindMin = 0;
    strip(/\bin\s+\d+\s*(hours?|hrs?|h)\b/i);
  } else if ((m = text.match(/\bin\s+(\d+)\s*(days?|d)\b/i))) {
    dueDate = ymd(addDays(now, parseInt(m[1], 10)));
    strip(/\bin\s+\d+\s*(days?|d)\b/i);
  }

  // Day words
  if (!dueDate) {
    if (/\btoday\b/i.test(text)) { dueDate = ymd(now); strip(/\btoday\b/gi); }
    else if (/\btonight\b/i.test(text)) { dueDate = ymd(now); if (!time) time = "20:00"; strip(/\btonight\b/gi); }
    else if (/\b(tomorrow|tmr|tmrw)\b/i.test(text)) { dueDate = ymd(addDays(now, 1)); strip(/\b(tomorrow|tmr|tmrw)\b/gi); }
    else {
      const wd = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const re = new RegExp("\\b(next\\s+)?(" + wd.join("|") + ")\\b", "i");
      const wm = text.match(re);
      if (wm) {
        let diff = (wd.indexOf(wm[2].toLowerCase()) - now.getDay() + 7) % 7;
        if (diff === 0) diff = 7; // always the upcoming one
        dueDate = ymd(addDays(now, diff));
        strip(re);
      }
    }
  }

  // Parts of day
  if (!time) {
    if (/\bmorning\b/i.test(text)) { time = "09:00"; strip(/\bmorning\b/gi); }
    else if (/\bnoon\b/i.test(text)) { time = "12:00"; strip(/\bnoon\b/gi); }
    else if (/\bafternoon\b/i.test(text)) { time = "14:00"; strip(/\bafternoon\b/gi); }
    else if (/\bevening\b/i.test(text)) { time = "18:00"; strip(/\bevening\b/gi); }
    else if (/\bmidnight\b/i.test(text)) { time = "00:00"; strip(/\bmidnight\b/gi); }
  }

  // Explicit time
  if (!time) {
    if ((m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))) {
      let h = parseInt(m[1], 10) % 12;
      if (/pm/i.test(m[3])) h += 12;
      time = `${pad(h)}:${pad(m[2] ? parseInt(m[2], 10) : 0)}`;
      strip(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i);
    } else if ((m = text.match(/\b(\d{1,2}):(\d{2})\b/))) {
      time = `${pad(parseInt(m[1], 10))}:${pad(parseInt(m[2], 10))}`;
      strip(/\b\d{1,2}:\d{2}\b/);
    } else if ((m = text.match(/\bat\s+(\d{1,2})\b/i))) {
      let h = parseInt(m[1], 10);
      if (h >= 1 && h <= 7) h += 12; // "at 3" -> 3pm
      time = `${pad(h)}:00`;
      strip(/\bat\s+\d{1,2}\b/i);
    }
  }

  // A time but no date -> today, or tomorrow if it's already past
  if (time && !dueDate) {
    const [h, mn] = time.split(":").map(Number);
    const cand = new Date(now); cand.setHours(h, mn, 0, 0);
    dueDate = cand < now ? ymd(addDays(now, 1)) : ymd(now);
  }

  // Reminder defaults
  if (remindMin === -1) {
    if (time) remindMin = 0;
    else if (wantsReminder && dueDate) { time = "09:00"; remindMin = 0; }
  }

  // Clean up the title
  let title = text
    .replace(/\b(please|pls)\b/gi, " ")
    .replace(/^\s*(remind\s+me\s+to|remind\s+me|remind\s+to|reminder\s+to|remember\s+to|reminder|remember|remind|todo|task|add)\b[:\-\s]*/i, " ")
    .replace(/\bremind\s+me\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|on|by|the)\s+/i, "")
    .replace(/\s+(at|on|by|to)\s*$/i, "")
    .trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, dueDate, time, remindMin, repeat, priority };
}

function quickPreviewText(p) {
  const bits = [];
  if (p.priority === "high") bits.push("❗ urgent");
  if (p.dueDate) bits.push(relativeDayLabel(p.dueDate));
  if (p.time) bits.push(fmtTime(p.time));
  if (p.remindMin >= 0) bits.push("🔔 reminder");
  if (p.repeat) bits.push("🔁 " + p.repeat);
  return bits.join(" · ");
}

function updateQuickPreview() {
  const raw = quickInput.value.trim();
  if (!raw) { quickPreview.textContent = ""; return; }
  quickPreview.textContent = quickPreviewText(parseQuickAdd(raw));
}

function openQuickAdd() {
  quickInput.value = "";
  quickPreview.textContent = "";
  quickAdded.textContent = "";
  quickDialog.showModal();
  quickInput.focus();
}

fab.addEventListener("click", () => { buzz(8); openQuickAdd(); });
quickCancelBtn.addEventListener("click", () => quickDialog.close());
quickInput.addEventListener("input", updateQuickPreview);

quickSuggestions.addEventListener("click", (event) => {
  const chip = event.target.closest(".suggest-chip");
  if (!chip) return;
  const cur = quickInput.value.trim();
  quickInput.value = (cur ? cur + " " : "") + chip.dataset.append + " ";
  quickInput.focus();
  updateQuickPreview();
});

quickForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = quickInput.value.trim();
  if (!raw) { quickInput.focus(); return; }
  const p = parseQuickAdd(raw);
  if (!p.title) p.title = raw; // fall back to the raw text if parsing emptied it
  await createTask({
    title: p.title,
    listId: defaultListId(),
    priority: p.priority,
    dueDate: p.dueDate,
    time: p.time,
    durationMin: p.time ? 30 : 0,
    repeat: p.repeat,
    remindMin: p.remindMin,
    notes: "",
  });
  buzz(10);
  // Close the sheet on Add and confirm with a toast.
  const when = quickPreviewText(p);
  quickDialog.close();
  showToast(`Added “${p.title}”${when ? " · " + when : ""}`);
});

quickMoreBtn.addEventListener("click", () => {
  const p = parseQuickAdd(quickInput.value.trim());
  quickDialog.close();
  openTaskDialog("create", null, {
    title: p.title, priority: p.priority, date: p.dueDate, time: p.time,
    durationMin: p.time ? 30 : 0, repeat: p.repeat, remindMin: p.remindMin,
  });
});

taskForm.addEventListener("submit", async (event) => {
  const title = taskTitleInput.value.trim();
  if (!title) { event.preventDefault(); taskTitleInput.focus(); return; }
  // Fold an unsubmitted step in the input into the list.
  if (subtaskInput.value.trim()) addSubtaskFromInput();
  const data = {
    title,
    listId: taskListSelect.value || "",
    priority: taskPriority.value,
    dueDate: taskDate.value || "",
    time: taskTime.value || "",
    durationMin: Number(taskDuration.value) || 0,
    repeat: taskRepeat.value || "",
    remindMin: Number(taskRemind.value),
    notes: taskNotes.value.trim(),
  };
  // Include subtasks only when there are steps now, or there were before (to
  // persist clearing them). Keeps no-step tasks compatible with older rules.
  const subs = sanitizeSubtasks(editingSubtasks);
  const hadSubs = taskDialogMode === "edit" && (tasks.find((t) => t.id === editingTaskId)?.subtasks || []).length;
  if (subs.length || hadSubs) data.subtasks = subs;
  if (taskDialogMode === "edit" && editingTaskId) await updateTask(editingTaskId, data);
  else await createTask(data);
  buzz(8);
});

taskDeleteBtn.addEventListener("click", () => {
  if (!editingTaskId) return;
  const id = editingTaskId;
  taskDialog.close();
  deleteTaskWithUndo(id);
});

/* ============================================================
   List dialog
   ============================================================ */
function buildColorPicker(selected) {
  colorPicker.replaceChildren();
  pendingColor = selected;
  LIST_COLORS.forEach((color) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "color-swatch";
    sw.style.background = color;
    sw.setAttribute("role", "radio");
    sw.setAttribute("aria-label", color);
    sw.setAttribute("aria-checked", color === selected ? "true" : "false");
    sw.addEventListener("click", () => {
      pendingColor = color;
      colorPicker.querySelectorAll(".color-swatch").forEach((s) => s.setAttribute("aria-checked", "false"));
      sw.setAttribute("aria-checked", "true");
    });
    colorPicker.append(sw);
  });
}

function openListDialog(mode) {
  listDialogMode = mode;
  const current = activeList();
  if (mode === "edit" && current) {
    editingListId = current.id;
    listDialogTitle.textContent = "Edit list";
    listNameInput.value = current.name;
    buildColorPicker(current.color || LIST_COLORS[0]);
    listDeleteBtn.hidden = false;
  } else {
    editingListId = null;
    listDialogTitle.textContent = "New list";
    listNameInput.value = "";
    buildColorPicker(LIST_COLORS[lists.length % LIST_COLORS.length]);
    listDeleteBtn.hidden = true;
  }
  listDialog.showModal();
  listNameInput.focus();
  listNameInput.select();
}

addListButton.addEventListener("click", () => openListDialog("create"));
renameListButton.addEventListener("click", () => openListDialog("edit"));
listCancelBtn.addEventListener("click", () => listDialog.close());

listForm.addEventListener("submit", (event) => {
  const name = listNameInput.value.trim();
  if (!name) { event.preventDefault(); listNameInput.focus(); return; }
  if (listDialogMode === "edit" && editingListId) updateList(editingListId, name, pendingColor);
  else createList(name, pendingColor);
});

listDeleteBtn.addEventListener("click", () => {
  const current = activeList();
  if (!current) return;
  if (!confirm(`Delete "${current.name}" and its tasks?`)) return;
  listDialog.close();
  deleteList(current.id);
});

listsTabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".list-tab");
  if (!tab || tab.dataset.id === activeListId) return;
  setActiveList(tab.dataset.id);
});

/* ============================================================
   Filters & clear done
   ============================================================ */
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((f) => f.classList.remove("active"));
    button.classList.add("active");
    renderLists();
  });
});

clearDoneButton.addEventListener("click", async () => {
  // Clear done within the currently shown set (real list, smart list, or no-list).
  let doneTasks;
  if (isSmart(activeListId)) doneTasks = smartFilter(activeListId).filter((t) => t.done);
  else if (activeList()) doneTasks = tasks.filter((t) => t.done && t.listId === activeListId);
  else doneTasks = tasks.filter((t) => t.done && (!t.listId || !listById(t.listId)));
  if (doneTasks.length === 0) return;
  buzz(10);
  if (online) await Promise.all(doneTasks.map((t) => removeTask(t.id)));
  else { tasks = tasks.filter((t) => !doneTasks.includes(t)); saveTasks(); renderCurrent(); }
  showToast(`Cleared ${doneTasks.length} done task${doneTasks.length > 1 ? "s" : ""}`);
});

/* ============================================================
   Search
   ============================================================ */
function openSearch() {
  searchInput.value = "";
  renderSearch("");
  searchDialog.showModal();
  setTimeout(() => searchInput.focus(), 50);
}

function renderSearch(query) {
  const q = query.trim().toLowerCase();
  searchResults.replaceChildren();
  if (!q) {
    searchEmpty.textContent = "Type to search across every task — title, notes, or list.";
    return;
  }
  const matches = tasks
    .map((t) => {
      const title = (t.title || "").toLowerCase();
      const notes = (t.notes || "").toLowerCase();
      const listName = (listById(t.listId)?.name || "").toLowerCase();
      let score = 0;
      if (title.startsWith(q)) score = 3;
      else if (title.includes(q)) score = 2;
      else if (listName.includes(q) || notes.includes(q)) score = 1;
      else if ((t.subtasks || []).some((s) => (s.title || "").toLowerCase().includes(q))) score = 1;
      return { t, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || (b.t.createdAt - a.t.createdAt))
    .slice(0, 50);

  // Offer to create a task from the query.
  const create = document.createElement("button");
  create.type = "button";
  create.className = "ghost-button search-create";
  create.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-plus" /></svg><span>Create “${escapeHtml(query.trim())}”</span>`;
  create.addEventListener("click", () => { searchDialog.close(); openTaskDialog("create", null, { title: query.trim() }); });

  if (matches.length === 0) {
    searchEmpty.textContent = "No matching tasks.";
    searchResults.append(create);
    return;
  }
  searchEmpty.textContent = "";
  let i = 0;
  matches.forEach((m) => searchResults.append(buildTaskItem(m.t, i++, false)));
  searchResults.append(create);
  knownIds = new Set(tasks.map((t) => t.id));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

searchToggle.addEventListener("click", () => { buzz(6); openSearch(); });
searchClose.addEventListener("click", () => searchDialog.close());
searchInput.addEventListener("input", () => renderSearch(searchInput.value));
searchResults.addEventListener("click", (event) => {
  const li = event.target.closest(".task-item");
  if (!li) return;
  if (event.target.closest(".check-button")) { toggleTask(li.dataset.id); renderSearch(searchInput.value); }
  else { searchDialog.close(); openTaskDialog("edit", li.dataset.id); }
});

/* ============================================================
   Reminders — local (while open) + Web Push (when closed)
   ============================================================ */
function updateNotifyButton() {
  const granted = "Notification" in window && Notification.permission === "granted";
  notifyToggle.classList.toggle("is-on", granted);
  notifyToggle.setAttribute("aria-label", granted ? "Reminders on" : "Enable reminders");
}

// Base64url VAPID key -> Uint8Array for PushManager.
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Subscribe this device to Web Push and store the subscription in Firestore so
// the cloud scheduler can reach it when the app is closed.
async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    await savePushSubscription(sub);
    return true;
  } catch (err) {
    return false;
  }
}

async function savePushSubscription(sub) {
  if (!online) return;
  const json = sub.toJSON();
  // Deterministic doc id from the endpoint so re-subscribing updates in place.
  const id = "s" + Math.abs([...sub.endpoint].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36);
  const subsCol = online.fb.collection(online.db, "pushSubs");
  await online.fb.setDoc(online.fb.doc(subsCol, id), {
    board: boardId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh || "",
    auth: json.keys?.auth || "",
    // Minutes east of UTC, so the scheduler can resolve your local task times.
    tz: -new Date().getTimezoneOffset(),
    createdAt: Date.now(),
  });
}

notifyToggle.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    // iOS Safari only exposes notifications to an installed (home-screen) PWA.
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    showToast(iOS ? "On iPhone: Share → Add to Home Screen, then open it from there." : "This device doesn't support notifications.");
    return;
  }
  if (Notification.permission === "denied") {
    showToast("Notifications are blocked. Enable them in your device settings.");
    return;
  }
  if (Notification.permission !== "granted") {
    const result = await Notification.requestPermission();
    updateNotifyButton();
    if (result !== "granted") { showToast("Reminders blocked in browser settings"); return; }
  }
  const pushed = await subscribeToPush();
  showToast(pushed ? "Reminders on — they'll reach you even when closed 🔔" : "Reminders on (this device, while open).");
});

// If permission is already granted, keep the push subscription fresh on launch.
function refreshPushOnLaunch() {
  if ("Notification" in window && Notification.permission === "granted") subscribeToPush();
}

function checkReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = Date.now();
  tasks.forEach((task) => {
    if (task.done || !task.dueDate || Number(task.remindMin) < 0) return;
    const at = taskDateTime(task);
    if (!at) return;
    const fireAt = at.getTime() - Number(task.remindMin) * 60000;
    const key = `${task.id}@${task.dueDate}${task.time}`;
    if (now >= fireAt && now < fireAt + 90000 && !notified.has(key)) {
      notified.add(key);
      saveNotified();
      fireNotification(task);
    }
  });
}

function fireNotification(task) {
  const list = listById(task.listId);
  const body = (task.time ? fmtTime(task.time) + " · " : "") + (list ? list.name : "Task");
  const opts = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: task.id };
  navigator.serviceWorker?.ready
    .then((reg) => reg.showNotification(task.title, opts))
    .catch(() => { try { new Notification(task.title, opts); } catch {} });
  buzz(20);
}

/* ============================================================
   Overflow menu (secondary actions)
   ============================================================ */
function openMoreMenu() {
  moreMenu.hidden = false;
  moreToggle.setAttribute("aria-expanded", "true");
}
function closeMoreMenu() {
  moreMenu.hidden = true;
  moreToggle.setAttribute("aria-expanded", "false");
}
moreToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  moreMenu.hidden ? openMoreMenu() : closeMoreMenu();
});
document.addEventListener("click", (event) => {
  if (!moreMenu.hidden && !moreMenu.contains(event.target) && event.target !== moreToggle) closeMoreMenu();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMoreMenu(); });

/* ============================================================
   Share & install
   ============================================================ */
shareButton.addEventListener("click", async () => {
  closeMoreMenu();
  const url = window.location.href;
  try { if (navigator.share) { await navigator.share({ title: "My Planner", text: "My planner:", url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); showToast("Link copied"); } catch { showToast("Copy this page's link to share"); }
});

window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; installButton.hidden = false; });
installButton.addEventListener("click", async () => {
  closeMoreMenu();
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => { installButton.hidden = true; showToast("Installed — find it on your home screen"); });

/* ============================================================
   Settings panel
   ============================================================ */
function buildAccentPicker() {
  accentPicker.replaceChildren();
  ACCENTS.forEach((color) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "color-swatch accent-swatch";
    sw.setAttribute("role", "radio");
    if (color) {
      sw.style.background = color;
      sw.setAttribute("aria-label", color);
    } else {
      sw.style.background = "conic-gradient(from 90deg, #3f5cf0, #7c4dff, #2bb1c4, #2f8f5b, #e0573f, #e05f9a, #3f5cf0)";
      sw.setAttribute("aria-label", "Default (follows theme)");
    }
    sw.setAttribute("aria-checked", settings.accent === color ? "true" : "false");
    sw.addEventListener("click", () => {
      settings.accent = color;
      saveSettings();
      applySettings();
      accentPicker.querySelectorAll(".accent-swatch").forEach((s) => s.setAttribute("aria-checked", "false"));
      sw.setAttribute("aria-checked", "true");
      buzz(6);
    });
    accentPicker.append(sw);
  });
}

function fillHourOptions(select, from, to, selected) {
  select.replaceChildren();
  for (let h = from; h <= to; h++) {
    const opt = document.createElement("option");
    opt.value = String(h);
    const d = new Date(); d.setHours(h, 0);
    opt.textContent = d.toLocaleTimeString(undefined, { hour: "numeric", hour12: settings.hour12 });
    if (h === selected) opt.selected = true;
    select.append(opt);
  }
}

function fillDefaultListOptions() {
  setDefaultlist.replaceChildren();
  const none = document.createElement("option");
  none.value = ""; none.textContent = "First list";
  setDefaultlist.append(none);
  lists.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id; opt.textContent = l.name;
    setDefaultlist.append(opt);
  });
  setDefaultlist.value = settings.defaultList || "";
}

function openSettings() {
  buildAccentPicker();
  setTheme.value = localStorage.getItem(themeKey) || "system";
  setWeekstart.value = String(settings.weekStart);
  setTimeformat.value = settings.hour12 ? "12" : "24";
  setRemind.value = String(settings.defaultRemind);
  fillDefaultListOptions();
  fillHourOptions(setWeekstarthour, 0, 12, settings.weekStartHour);
  fillHourOptions(setWeekendhour, 13, 23, settings.weekEndHour);
  setLock.value = settings.lock ? "on" : "off";
  setLockcode.value = settings.lockCode || "";
  backupStatus.textContent = "";
  settingsDialog.showModal();
}
function applyAndRerender() {
  saveSettings();
  applySettings();
  renderCurrent();
}

settingsButton.addEventListener("click", () => { closeMoreMenu(); openSettings(); });
settingsClose.addEventListener("click", () => settingsDialog.close());

setTheme.addEventListener("change", () => {
  if (setTheme.value === "system") { localStorage.removeItem(themeKey); applyTheme(currentTheme()); }
  else { localStorage.setItem(themeKey, setTheme.value); applyTheme(setTheme.value); }
});
setWeekstart.addEventListener("change", () => { settings.weekStart = Number(setWeekstart.value); weekAnchor = startOfWeek(new Date()); applyAndRerender(); });
setTimeformat.addEventListener("change", () => { settings.hour12 = setTimeformat.value === "12"; applyAndRerender(); });
setRemind.addEventListener("change", () => { settings.defaultRemind = Number(setRemind.value); saveSettings(); });
setDefaultlist.addEventListener("change", () => { settings.defaultList = setDefaultlist.value; saveSettings(); });
setWeekstarthour.addEventListener("change", () => { settings.weekStartHour = Number(setWeekstarthour.value); applyAndRerender(); });
setWeekendhour.addEventListener("change", () => { settings.weekEndHour = Number(setWeekendhour.value); applyAndRerender(); });

/* ============================================================
   Export / Import / Backup
   ============================================================ */
function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function stamp() { return new Date().toISOString().slice(0, 10); }

function exportJSON() {
  const data = { app: "my-planner", version: 1, exportedAt: Date.now(), board: boardId, lists, tasks };
  downloadFile(`planner-backup-${stamp()}.json`, "application/json", JSON.stringify(data, null, 2));
  backupStatus.textContent = "Backup downloaded ✓";
}
function csvCell(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function exportCSV() {
  const head = ["Title", "List", "Date", "Time", "Duration(min)", "Priority", "Done", "Repeat", "Remind(min)", "Steps", "Notes"];
  const rows = tasks.map((t) => [
    t.title, listById(t.listId)?.name || "", t.dueDate || "", t.time || "", t.durationMin || 0,
    t.priority || "", t.done ? "yes" : "no", t.repeat || "", t.remindMin,
    (t.subtasks || []).map((s) => (s.done ? "[x] " : "[ ] ") + s.title).join(" | "), t.notes || "",
  ].map(csvCell).join(","));
  downloadFile(`planner-tasks-${stamp()}.csv`, "text/csv", [head.join(","), ...rows].join("\n"));
  backupStatus.textContent = "CSV downloaded ✓";
}
function icsDate(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-");
  if (!timeStr) return { allDay: true, v: `${y}${m}${d}` };
  const [hh, mm] = timeStr.split(":");
  return { allDay: false, v: `${y}${m}${d}T${hh}${mm}00` };
}
function exportICS() {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//My Planner//EN", "CALSCALE:GREGORIAN"];
  tasks.filter((t) => t.dueDate).forEach((t) => {
    const start = icsDate(t.dueDate, t.time);
    lines.push("BEGIN:VEVENT", `UID:${t.id}@my-planner`, `DTSTAMP:${stamp().replace(/-/g, "")}T000000`);
    if (start.allDay) lines.push(`DTSTART;VALUE=DATE:${start.v}`);
    else {
      lines.push(`DTSTART:${start.v}`);
      const dur = Number(t.durationMin) || 30;
      lines.push(`DURATION:PT${dur}M`);
    }
    lines.push(`SUMMARY:${(t.title || "").replace(/\n/g, " ")}`);
    if (t.notes) lines.push(`DESCRIPTION:${t.notes.replace(/\n/g, " ")}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  downloadFile(`planner-${stamp()}.ics`, "text/calendar", lines.join("\r\n"));
  backupStatus.textContent = "Calendar file downloaded ✓";
}

async function importData(json) {
  let data;
  try { data = JSON.parse(json); } catch { backupStatus.textContent = "That file isn't valid JSON."; return; }
  const inLists = Array.isArray(data.lists) ? data.lists : [];
  const inTasks = Array.isArray(data.tasks) ? data.tasks : [];
  if (!inLists.length && !inTasks.length) { backupStatus.textContent = "No tasks found in that file."; return; }
  if (!confirm(`Restore ${inTasks.length} task(s) and ${inLists.length} list(s)? This merges into your current planner.`)) return;
  if (online) {
    await Promise.all(inLists.map((l) => online.fb.setDoc(online.fb.doc(listsCol(), String(l.id || crypto.randomUUID())), listFields({ ...l, createdAt: l.createdAt || Date.now() }))));
    await Promise.all(inTasks.map((t) => online.fb.setDoc(online.fb.doc(tasksCol(), String(t.id || crypto.randomUUID())), taskFields({ ...t, createdAt: t.createdAt || Date.now() }))));
  } else {
    inLists.forEach((l) => { const id = String(l.id || crypto.randomUUID()); if (!lists.some((x) => x.id === id)) lists.push({ id, ...listFields({ ...l, createdAt: l.createdAt || Date.now() }) }); });
    inTasks.forEach((t) => { const id = String(t.id || crypto.randomUUID()); const i = tasks.findIndex((x) => x.id === id); const rec = { id, ...taskFields({ ...t, createdAt: t.createdAt || Date.now() }) }; if (i >= 0) tasks[i] = rec; else tasks.unshift(rec); });
    saveLists(); saveTasks(); renderCurrent();
  }
  backupStatus.textContent = `Restored ${inTasks.length} task(s) ✓`;
  buzz(12);
}

exportJsonBtn.addEventListener("click", exportJSON);
exportCsvBtn.addEventListener("click", exportCSV);
exportIcsBtn.addEventListener("click", exportICS);
importJsonBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
  const file = importFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { importData(String(reader.result)); importFile.value = ""; };
  reader.readAsText(file);
});

// Keep a daily local snapshot (last 5) so data is never one mistake away from gone.
function runDailyBackup() {
  try {
    const key = backupPrefix + stamp();
    if (!localStorage.getItem(key) && (lists.length || tasks.length)) {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), lists, tasks }));
    }
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(backupPrefix)).sort();
    while (keys.length > 5) localStorage.removeItem(keys.shift());
  } catch {}
}

/* ============================================================
   Passcode lock (soft privacy screen)
   ============================================================ */
let lockEntry = "";
let lockBuilt = false;
const lockCodeOf = () => settings.lockCode || "0800";

function buildKeypad() {
  if (lockBuilt) return;
  lockBuilt = true;
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "blank", "0", "back"].forEach((k) => {
    const btn = document.createElement("button");
    btn.type = "button";
    if (k === "blank") { btn.className = "lock-key blank"; btn.disabled = true; }
    else if (k === "back") {
      btn.className = "lock-key act";
      btn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-backspace" /></svg>`;
      btn.setAttribute("aria-label", "Delete");
      btn.addEventListener("click", () => { lockEntry = lockEntry.slice(0, -1); renderLockDots(); });
    } else {
      btn.className = "lock-key";
      btn.textContent = k;
      btn.addEventListener("click", () => lockDigit(k));
    }
    lockKeypad.append(btn);
  });
}
function renderLockDots() {
  lockDots.replaceChildren();
  const len = lockCodeOf().length || 4;
  for (let i = 0; i < len; i++) {
    const d = document.createElement("i");
    if (i < lockEntry.length) d.classList.add("on");
    lockDots.append(d);
  }
}
function lockDigit(d) {
  if (lockEntry.length >= lockCodeOf().length) return;
  lockEntry += d;
  renderLockDots();
  buzz(5);
  if (lockEntry.length === lockCodeOf().length) setTimeout(checkLock, 120);
}
function checkLock() {
  if (lockEntry === lockCodeOf()) {
    sessionStorage.setItem(unlockedKey, "1");
    lockScreen.hidden = true;
    lockEntry = "";
    buzz(14);
  } else {
    lockInner.classList.add("bad");
    buzz([10, 40, 10]);
    setTimeout(() => { lockInner.classList.remove("bad"); lockEntry = ""; renderLockDots(); }, 450);
  }
}
function showLock() {
  buildKeypad();
  lockEntry = "";
  renderLockDots();
  lockScreen.hidden = false;
}
function maybeLock() {
  if (settings.lock && lockCodeOf().length >= 1 && sessionStorage.getItem(unlockedKey) !== "1") showLock();
}

/* Settings wiring for the lock */
setLock.addEventListener("change", () => { settings.lock = setLock.value === "on"; saveSettings(); });
setLockcode.addEventListener("input", () => {
  setLockcode.value = setLockcode.value.replace(/\D/g, "").slice(0, 4);
  settings.lockCode = setLockcode.value || "0800";
  saveSettings();
});

/* ============================================================
   Keyboard shortcuts (desktop convenience)
   ============================================================ */
document.addEventListener("keydown", (event) => {
  // Command palette: ⌘K / Ctrl+K opens search from anywhere.
  if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
    event.preventDefault();
    if (!searchDialog.open) openSearch();
    return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
  const anyDialogOpen = document.querySelector("dialog[open]");
  if (typing || anyDialogOpen || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "n" || event.key === "/") { event.preventDefault(); openQuickAdd(); }
  else if (event.key === "t") setView("today");
  else if (event.key === "w") setView("week");
  else if (event.key === "m") setView("month");
  else if (event.key === "l") setView("lists");
});

/* ============================================================
   iOS keyboard handling — float open bottom sheets above the keyboard
   ============================================================ */
const visualVp = window.visualViewport;
function syncSheetViewport() {
  const root = document.documentElement.style;
  const sheetOpen = document.querySelector("dialog.sheet[open]");
  if (!sheetOpen || !visualVp) {
    root.setProperty("--kb", "0px");
    root.removeProperty("--vvh");
    return;
  }
  // Keyboard height = layout viewport - visible (visual) viewport.
  const kb = Math.max(0, window.innerHeight - visualVp.height - visualVp.offsetTop);
  root.setProperty("--kb", `${kb}px`);
  root.setProperty("--vvh", `${visualVp.height}px`);
}
if (visualVp) {
  visualVp.addEventListener("resize", syncSheetViewport);
  visualVp.addEventListener("scroll", syncSheetViewport);
}
[quickDialog, taskDialog, settingsDialog].forEach((d) => d.addEventListener("close", syncSheetViewport));
// Keep the focused field visible inside a sheet once the keyboard settles.
document.addEventListener("focusin", (event) => {
  const sheet = event.target.closest?.("dialog.sheet");
  if (sheet && sheet.open && event.target.matches?.("input, textarea")) {
    setTimeout(() => {
      syncSheetViewport();
      try { event.target.scrollIntoView({ block: "nearest" }); } catch {}
    }, 280);
  }
});

/* ============================================================
   Boot
   ============================================================ */
window.addEventListener("resize", () => { moveFilterPill(); if (currentView === "week") renderWeek(); });
ensureTaskListOptions();
updateNotifyButton();
runDailyBackup();
maybeLock();
setView("today");
connectToFirebase();

// Refresh countdowns / progress periodically so "in 25m" stays accurate.
setInterval(() => { if (currentView === "today") renderToday(); }, 60000);
setInterval(checkReminders, 30000);
checkReminders();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
