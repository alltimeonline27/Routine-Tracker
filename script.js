// ===== Utilities =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Offline-safe localStorage gates
function safeStorage() {
  try {
    const test = '__x';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { }
    };
  }
}
const storage = safeStorage();

// Simple hash (NOT secure, just to avoid plain-text). Use real crypto server-side in real apps.
function hash(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return String(h);
}

// Keys helper to namespace per user
const APP_PREFIX = "rt_v3";
let currentUser = null;
function k(key) { return `${APP_PREFIX}:${currentUser}:${key}`; }
function globalK(key) { return `${APP_PREFIX}:__global:${key}`; }

function loadJSON(key, fallback) {
  try {
    const val = storage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { }
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// ===== Default Weekly Routine =====
const defaultRoutine = {
  Monday: [{ task: "Wake up, breakfast", category: "General" }, { task: "Hackathon Project", category: "Hackathon" }, { task: "YouTube + Web Skills", category: "YouTube/Web" }, { task: "Market", category: "Market" }, { task: "PW Class (4hr)", category: "PW Class" }, { task: "DPP / Notes Review", category: "General" }],
  Tuesday: [{ task: "Wake up, breakfast", category: "General" }, { task: "College 10:15–5:30", category: "College" }, { task: "PW Class (2hr)", category: "PW Class" }, { task: "Hackathon / YouTube", category: "Hackathon" }, { task: "Web/App Skills", category: "Web" }],
  Wednesday: [{ task: "Wake up, breakfast", category: "General" }, { task: "Hackathon Project", category: "Hackathon" }, { task: "College 11:55–5:30", category: "College" }, { task: "PW Class (2hr)", category: "PW Class" }, { task: "Web/App Skills", category: "Web" }],
  Thursday: [{ task: "Wake up, breakfast", category: "General" }, { task: "College 12:45–5:00", category: "College" }, { task: "PW Class (2hr)", category: "PW Class" }, { task: "Hackathon / YouTube", category: "Hackathon" }, { task: "Web/App Skills", category: "Web" }],
  Friday: [{ task: "Wake up, breakfast", category: "General" }, { task: "College 10:15–5:30", category: "College" }, { task: "PW Class (2hr)", category: "PW Class" }, { task: "Hackathon / YouTube", category: "Hackathon" }, { task: "Web/App Skills", category: "Web" }],
  Saturday: [{ task: "Wake up, breakfast", category: "General" }, { task: "College 10:15–2:30", category: "College" }, { task: "PW Class (4hr)", category: "PW Class" }, { task: "Hackathon / YouTube", category: "Hackathon" }, { task: "Market", category: "Market" }],
  Sunday: [{ task: "Wake up, breakfast", category: "General" }, { task: "Hackathon Project", category: "Hackathon" }, { task: "PW Class (4hr)", category: "PW Class" }, { task: "YouTube + Web Skills", category: "YouTube/Web" }, { task: "Market", category: "Market" }]
};

// ===== DOM (App) =====
const taskList = $("#taskList");
const dateDisplay = $("#date");
const pointsDisplay = $("#pointsDisplay");
const weeklyPointsDisplay = $("#weeklyPointsDisplay");
const monthlyPointsDisplay = $("#monthlyPointsDisplay");
const streakDisplay = $("#streakDisplay");
const achievementsDisplay = $("#achievementsDisplay");
const motivationQuote = $("#motivationQuote");
const resetTodayBtn = $("#resetToday");
const resetWeekBtn = $("#resetWeek");
const resetMonthBtn = $("#resetMonth");
const toggleDarkBtn = $("#toggleDarkMode");
const exportBtn = $("#exportCSV");
const progressBar = $("#progressBar");
const progressText = $("#progressText");
const confettiCanvas = $("#confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");
const taskSound = $("#taskSound");
const timerSound = $("#timerSound");
const startStopBtn = $("#startStop");
const resetTimerBtn = $("#resetTimer");
const timerDisplay = $("#timer");
const hamburger = $(".hamburger");
const navMenu = $("#nav-menu");
const filterButtons = $$(".filter-btn");
const timerPresets = $$(".timer-preset");
const modeButtons = $$(".mode-btn");
const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const taskCategory = $("#taskCategory");
const appTitle = $("#appTitle");
const appNav = $("#appNav");
const appHeader = $("#appHeader");
const appMain = $("#main");
const appFooter = $("#appFooter");
const currentUserLabel = $("#currentUserLabel");
const logoutBtn = $("#logoutBtn");
const yearEl = $("#year");
const viewRatingHistoryBtn = $("#viewRatingHistory");

// ===== DOM (Auth) =====
const auth = $("#auth");
const authForm = $("#authForm");
const authUsername = $("#authUsername");
const authPassword = $("#authPassword");
const savedUsersList = $("#savedUsers");
const clearAllUsersBtn = $("#clearAllUsers");

// ===== State =====
let now = new Date();
let dayName = now.toLocaleString('en-US', { weekday: 'long' });
let currentFilter = "all";
let confettiParticles = [];

const quotes = [
  "Push yourself, because no one else is going to do it for you.",
  "Small daily improvements are the key to staggering long-term results.",
  "Focus on being productive instead of busy.",
  "Discipline is the bridge between goals and accomplishment.",
  "Don't watch the clock; do what it does – keep going.",
  "Your time is limited, don't waste it living someone else's life.",
  "The way to get started is to quit talking and begin doing.",
  "The harder you work for something, the greater you'll feel when you achieve it."
];

const achievements = [
  { points: 3, name: "Bronze 🥉" },
  { points: 6, name: "Silver 🥈" },
  { points: 9, name: "Gold 🥇" },
  { points: 12, name: "Platinum 🌟" },
  { points: 20, name: "Master 🏆" },
  { points: 30, name: "Grand Master 🎯" }
];

// Timer state (Pomodoro)
const POMODURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
let mode = "focus";
let timeLeft = POMODURATIONS[mode];
let timerInterval = null;
let isTimerRunning = false;

// Rating history state
let ratingHistoryData = [];

// ===== Auth & App Boot =====
function showAppShell(show) {
  [appNav, appHeader, appMain, appFooter].forEach(el => el.classList.toggle('hidden', !show));
  auth.classList.toggle('hidden', show);
}

function getUsers() { return loadJSON(globalK("users"), []); }
function saveUsers(users) { saveJSON(globalK("users"), users); }
function addOrUpdateUser(u) {
  const users = getUsers();
  const idx = users.findIndex(x => x.username === u.username);
  if (idx >= 0) users[idx] = u; else users.push(u);
  saveUsers(users);
}
function userExists(username) { return getUsers().some(u => u.username === username); }
function findUser(username) { return getUsers().find(u => u.username === username); }

function renderSavedUsers() {
  const users = getUsers();
  savedUsersList.innerHTML = "";
  if (!users.length) {
    const li = document.createElement('li');
    li.textContent = "No saved users yet.";
    li.style.opacity = .8;
    savedUsersList.appendChild(li);
  } else {
    users.forEach(u => {
      const btn = document.createElement('button');
      btn.className = "btn-secondary";
      btn.type = "button";
      btn.innerHTML = `<i class="fa-solid fa-user"></i> ${u.username}`;
      btn.addEventListener('click', () => {
        authUsername.value = u.username;
        authPassword.value = "";
        authPassword.focus();
      });
      const li = document.createElement('li');
      li.appendChild(btn);
      savedUsersList.appendChild(li);
    });
  }
}

function login(username, password) {
  username = username.trim();
  if (!username) return alert("Enter username");
  const users = getUsers();
  const u = users.find(x => x.username === username);
  if (u) {
    if (u.passwordHash !== hash(password)) { alert("Wrong password"); return; }
  } else {
    // First-time create account
    addOrUpdateUser({ username, passwordHash: hash(password), createdAt: Date.now() });
  }
  currentUser = username;
  storage.setItem(globalK("currentUser"), currentUser);
  bootAppForUser();
}

function logout() {
  currentUser = null;
  storage.removeItem(globalK("currentUser"));
  showAppShell(false);
  authUsername.value = "";
  authPassword.value = "";
  renderSavedUsers();
}

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  login(authUsername.value, authPassword.value);
});
clearAllUsersBtn.addEventListener('click', () => {
  if (!confirm("Remove all saved users on this device? This does not delete per-user task data.")) return;
  saveUsers([]);
  renderSavedUsers();
});

function bootAppForUser() {
  // Set title, user chip
  appTitle.textContent = `${currentUser}'s Daily Routine Tracker`;
  currentUserLabel.textContent = currentUser;
  showAppShell(true);
  init();
}

logoutBtn.addEventListener('click', () => {
  if (confirm("Log out and switch user?")) logout();
});

// Auto-login last user if present
document.addEventListener("DOMContentLoaded", () => {
  yearEl.textContent = String(new Date().getFullYear());
  const last = storage.getItem(globalK("currentUser"));
  renderSavedUsers();
  if (last) { currentUser = last; bootAppForUser(); }
  else { showAppShell(false); }
});

// ===== Per-user storage-backed state =====
function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function monthKey(d) { return `${d.getFullYear()}-${d.getMonth() + 1}`; }
function lastNDaysDates(n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    list.push(todayKey(d));
  }
  return list.reverse();
}

// ==== User-Scoped Vars (loaded in init) ====
let customRoutineByDay = {};
let completionLog = {};
let weeklyPoints = 0;
let monthlyPointsMap = {};
let streak = 0;
let lastCompletedDate = "";
let darkPref = false;

// ===== Init =====
function init() {
  now = new Date();
  dayName = now.toLocaleString('en-US', { weekday: 'long' });
  dateDisplay.textContent = `${dayName}, ${now.toLocaleDateString()}`;

  // Load user-scoped state
  customRoutineByDay = loadJSON(k("customRoutineByDay"), {});
  completionLog = loadJSON(k("completionLog"), {});
  weeklyPoints = parseInt(storage.getItem(k("weeklyPoints")) || "0", 10);
  monthlyPointsMap = loadJSON(k("monthlyPoints"), {});
  streak = parseInt(storage.getItem(k("streak")) || "0", 10);
  lastCompletedDate = storage.getItem(k("lastCompletedDate")) || "";
  darkPref = storage.getItem(k("darkMode")) === "true";

  // Dark mode
  if (darkPref) {
    document.body.classList.add("dark");
    toggleDarkBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    toggleDarkBtn.setAttribute("aria-pressed", "true");
  } else {
    document.body.classList.remove("dark");
    toggleDarkBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    toggleDarkBtn.setAttribute("aria-pressed", "false");
  }

  // Quote
  motivationQuote.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  // Navbar
  hamburger?.addEventListener("click", () => {
    const active = navMenu.classList.toggle("active");
    $(".hamburger").classList.toggle("active");
    $(".hamburger").setAttribute("aria-expanded", active ? "true" : "false");
  });
  $$("#nav-menu a").forEach(a => a.addEventListener("click", () => {
    navMenu.classList.remove("active");
    $(".hamburger").classList.remove("active");
    $(".hamburger").setAttribute("aria-expanded", "false");
  }));

  // Filters
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
      currentFilter = btn.dataset.category;
      renderTasks();
    });
  });

  // Task form
  taskForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = taskInput.value.trim();
    const cat = taskCategory.value.trim();
    if (!name || !cat) return;
    const arr = customRoutineByDay[dayName] || [];
    arr.push({ task: name, category: cat });
    customRoutineByDay[dayName] = arr;
    saveJSON(k("customRoutineByDay"), customRoutineByDay);
    taskForm.reset();
    renderTasks();
  });

  // ===== Dark mode =====
  toggleDarkBtn.addEventListener("click", () => {
    const on = document.body.classList.toggle("dark");
    storage.setItem(k("darkMode"), String(on));
    toggleDarkBtn.innerHTML = on ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
    toggleDarkBtn.setAttribute("aria-pressed", on ? "true" : "false");
    renderCharts(true); // re-render to match theme
  });

  // Resets
  resetTodayBtn.addEventListener("click", resetToday);
  resetWeekBtn.addEventListener("click", () => {
    if (confirm("Reset weekly points?")) {
      weeklyPoints = 0;
      storage.setItem(k("weeklyPoints"), "0");
      updatePoints();
      renderCharts(true);
    }
  });
  resetMonthBtn.addEventListener("click", () => {
    if (confirm("Reset this month's points?")) {
      const mk = monthKey(now);
      monthlyPointsMap[mk] = 0;
      saveJSON(k("monthlyPoints"), monthlyPointsMap);
      updatePoints();
      renderCharts(true);
    }
  });

  // Export
  exportBtn.addEventListener("click", exportCSV);

  // Timer
  $$(".timer-preset").forEach(p => p.addEventListener("click", () => {
    timeLeft = parseInt(p.dataset.minutes, 10) * 60;
    updateTimerDisplay();
    if (isTimerRunning) { clearInterval(timerInterval); startTimer(); }
  }));
  modeButtons.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  startStopBtn.addEventListener("click", () => isTimerRunning ? pauseTimer() : startTimer());
  resetTimerBtn.addEventListener("click", () => { pauseTimer(); setMode(mode); });

  // Notifications permission (non-blocking)
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => { });
  }

  // Rating system
  initRatingSystem();

  // Rating history button
  if (viewRatingHistoryBtn) {
    viewRatingHistoryBtn.addEventListener("click", showRatingHistory);
  }

  // Render
  renderTasks();
  updatePoints();
  renderCharts();

  // Maintain streak if day changed and yesterday had no completions
  maintainStreakOnNewDay();
}

// ===== Tasks =====
function getTodayTasks() {
  const base = defaultRoutine[dayName] || [];
  const custom = customRoutineByDay[dayName] || [];
  // Apply tombstones for defaults
  const tombs = custom.filter(x => x.task.startsWith("__HIDE__")).map(x => x.task.replace("__HIDE__", ""));
  const merged = [...base.filter(t => !tombs.includes(t.task)), ...custom.filter(c => !c.task.startsWith("__HIDE__"))];
  return merged;
}

function renderTasks() {
  taskList.innerHTML = "";
  const tasks = getTodayTasks();

  const today = todayKey(now);
  const completedToday = (completionLog[today] || []).map(x => x.task);

  tasks.forEach((t, index) => {
    if (currentFilter !== "all" && t.category !== currentFilter) return;

    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.setAttribute("aria-label", `Complete task: ${t.task}`);

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = t.task;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    const badge = document.createElement("span");
    badge.className = "task-category";
    badge.textContent = t.category;
    meta.appendChild(badge);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.type = "button";
    editBtn.title = "Edit task";
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.type = "button";
    delBtn.title = "Delete task";
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    actions.append(editBtn, delBtn);

    li.append(checkbox, title, meta, actions);
    taskList.appendChild(li);

    const isCompleted = completedToday.includes(t.task);
    checkbox.checked = isCompleted;
    if (isCompleted) li.classList.add("completed");

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) completeTask(t);
      else undoCompleteTask(t);
      updateProgressBar();
      renderCharts(true);
    });

    editBtn.addEventListener("click", () => {
      const newTask = prompt("Edit task name:", t.task);
      if (!newTask) return;
      const newCat = prompt("Edit category:", t.category) || t.category;

      // If task is in default routine, move it to custom overrides for that day
      const cust = customRoutineByDay[dayName] || [];
      let foundIdx = (customRoutineByDay[dayName] || []).findIndex(x => x.task === t.task && x.category === t.category);
      if (foundIdx === -1) { // push override
        cust.push({ task: newTask.trim(), category: newCat.trim() });
      } else {
        cust[foundIdx] = { task: newTask.trim(), category: newCat.trim() };
      }
      customRoutineByDay[dayName] = cust;
      saveJSON(k("customRoutineByDay"), customRoutineByDay);

      // Update completion log if name changed
      renameInCompletionLog(t.task, newTask.trim());

      renderTasks();
      updateProgressBar();
      renderCharts(true);
    });

    delBtn.addEventListener("click", () => {
      if (!confirm("Delete this task for this weekday?")) return;

      // Try to remove from custom first
      let cust = customRoutineByDay[dayName] || [];
      const idx = cust.findIndex(x => x.task === t.task && x.category === t.category);
      if (idx >= 0) {
        cust.splice(idx, 1);
        customRoutineByDay[dayName] = cust;
        saveJSON(k("customRoutineByDay"), customRoutineByDay);
      } else {
        // If it's a default task, hide it by adding a tombstone
        cust.push({ task: `__HIDE__${t.task}`, category: t.category });
        customRoutineByDay[dayName] = cust;
        saveJSON(k("customRoutineByDay"), customRoutineByDay);
      }

      // Remove from completion log
      removeFromCompletionLog(t.task);

      renderTasks();
      updateProgressBar();
      renderCharts(true);
    });
  });

  updateProgressBar();
}

function renameInCompletionLog(oldName, newName) {
  for (const date in completionLog) {
    const tasks = completionLog[date];
    const idx = tasks.findIndex(t => t.task === oldName);
    if (idx >= 0) {
      tasks[idx].task = newName;
    }
  }
  saveJSON(k("completionLog"), completionLog);
}

function removeFromCompletionLog(taskName) {
  for (const date in completionLog) {
    completionLog[date] = completionLog[date].filter(t => t.task !== taskName);
  }
  saveJSON(k("completionLog"), completionLog);
}

function completeTask(task) {
  const today = todayKey(now);
  const completedToday = completionLog[today] || [];
  if (!completedToday.some(t => t.task === task.task)) {
    completedToday.push({ task: task.task, category: task.category, completedAt: Date.now() });
    completionLog[today] = completedToday;
    saveJSON(k("completionLog"), completionLog);
    taskSound.currentTime = 0;
    taskSound.play().catch(() => { });
    updatePoints();
    updateStreak();
    updateProgressBar();
    checkAchievements();
  }
}

function undoCompleteTask(task) {
  const today = todayKey(now);
  const completedToday = completionLog[today] || [];
  const idx = completedToday.findIndex(t => t.task === task.task);
  if (idx >= 0) {
    completedToday.splice(idx, 1);
    completionLog[today] = completedToday;
    saveJSON(k("completionLog"), completionLog);
    updatePoints();
    updateStreak();
    updateProgressBar();
  }
}

function resetToday() {
  if (!confirm("Reset today's completions? This will clear all checkmarks.")) return;
  const today = todayKey(now);
  completionLog[today] = [];
  saveJSON(k("completionLog"), completionLog);
  renderTasks();
  updatePoints();
  updateStreak();
  updateProgressBar();
  renderCharts(true);
}

function updateProgressBar() {
  const tasks = getTodayTasks();
  const today = todayKey(now);
  const completedToday = completionLog[today] || [];
  const total = tasks.length;
  const done = completedToday.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${pct}% (${done}/${total} tasks)`;
  progressContainer.setAttribute("aria-valuenow", pct);
}

function updatePoints() {
  const today = todayKey(now);
  const completedToday = completionLog[today] || [];
  const points = completedToday.length;
  pointsDisplay.textContent = points;

  // Weekly points (last 7 days)
  const last7 = lastNDaysDates(7);
  weeklyPoints = last7.reduce((sum, d) => sum + (completionLog[d]?.length || 0), 0);
  storage.setItem(k("weeklyPoints"), String(weeklyPoints));
  weeklyPointsDisplay.textContent = weeklyPoints;

  // Monthly points (current month)
  const mk = monthKey(now);
  monthlyPointsMap[mk] = lastNDaysDates(31).filter(d => d.startsWith(mk)).reduce((sum, d) => sum + (completionLog[d]?.length || 0), 0);
  saveJSON(k("monthlyPoints"), monthlyPointsMap);
  monthlyPointsDisplay.textContent = monthlyPointsMap[mk] || 0;
}

function updateStreak() {
  const today = todayKey(now);
  const yesterday = todayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const completedToday = completionLog[today] || [];
  const completedYesterday = completionLog[yesterday] || [];

  if (completedToday.length > 0 && lastCompletedDate !== today) {
    if (lastCompletedDate === yesterday) {
      streak++;
    } else if (lastCompletedDate !== today) {
      streak = 1;
    }
    lastCompletedDate = today;
    storage.setItem(k("lastCompletedDate"), lastCompletedDate);
    storage.setItem(k("streak"), String(streak));
    streakDisplay.textContent = streak;
  } else if (completedToday.length === 0 && completedYesterday.length > 0 && lastCompletedDate === yesterday) {
    // Do nothing, streak remains
  } else if (completedToday.length === 0) {
    // Reset if no tasks today and we're not continuing from yesterday
    if (lastCompletedDate !== yesterday) {
      streak = 0;
      storage.setItem(k("streak"), "0");
      streakDisplay.textContent = "0";
    }
  }
}

function maintainStreakOnNewDay() {
  const today = todayKey(now);
  const yesterday = todayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const completedYesterday = completionLog[yesterday] || [];
  if (lastCompletedDate === yesterday && completedYesterday.length > 0) {
    // We had completions yesterday, so streak continues
    // Do nothing, streak remains
  } else if (lastCompletedDate !== yesterday && lastCompletedDate !== today) {
    // No completions yesterday and we haven't done any today -> reset streak
    streak = 0;
    storage.setItem(k("streak"), "0");
    streakDisplay.textContent = "0";
  }
}

function checkAchievements() {
  const today = todayKey(now);
  const completedToday = completionLog[today] || [];
  const points = completedToday.length;
  const ach = achievements.find(a => a.points === points);
  if (ach) {
    achievementsDisplay.innerHTML = `<span class="achievement-badge">${ach.name} (${points} tasks)</span>`;
    triggerConfetti();
  } else {
    achievementsDisplay.innerHTML = "";
  }
}

// ===== Timer =====
function setMode(newMode) {
  mode = newMode;
  timeLeft = POMODURATIONS[mode];
  updateTimerDisplay();
  modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
}

function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  startStopBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      startStopBtn.innerHTML = '<i class="fas fa-play"></i> Start';
      try {
        timerSound.currentTime = 0;
        timerSound.play().catch(() => { });
      } catch (e) {
        console.log("Could not play timer sound:", e);
      }
      if (Notification.permission === "granted") {
        new Notification("Timer finished!", { body: `Your ${mode} session is complete.` });
      }
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  startStopBtn.innerHTML = '<i class="fas fa-play"></i> Start';
}

// ===== Charts =====
let weeklyChart = null;
let monthlyChart = null;

function renderCharts(forceRedraw = false) {
  if (forceRedraw) {
    if (weeklyChart) weeklyChart.destroy();
    if (monthlyChart) monthlyChart.destroy();
  }

  // Weekly chart (last 7 days)
  const last7 = lastNDaysDates(7);
  const labels = last7.map(d => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}`;
  });
  const data = last7.map(d => (completionLog[d] || []).length);

  const ctx1 = $("#weeklyChart");
  if (ctx1) {
    weeklyChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tasks Completed',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // Monthly chart (last 6 months)
  const months = [];
  const monthData = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mk = `${d.getFullYear()}-${d.getMonth() + 1}`;
    months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    monthData.push(monthlyPointsMap[mk] || 0);
  }

  const ctx2 = $("#monthlyChart");
  if (ctx2) {
    monthlyChart = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Monthly Points',
          data: monthData,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }
}

// ===== Export =====
function exportCSV() {
  const dates = Object.keys(completionLog).sort();
  if (!dates.length) { alert("No data to export"); return; }

  let csv = "Date,Task,Category,Completed At\n";
  dates.forEach(d => {
    completionLog[d].forEach(t => {
      const dt = new Date(t.completedAt).toLocaleString();
      csv += `"${d}","${t.task}","${t.category}","${dt}"\n`;
    });
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `routine-tracker-${todayKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== Confetti =====
function triggerConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles = [];

  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10 - Math.random() * 100,
      size: 5 + Math.random() * 10,
      speed: 1 + Math.random() * 3,
      angle: Math.random() * Math.PI * 2,
      spin: Math.random() - 0.5,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`
    });
  }

  animateConfetti();
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let stillAlive = false;

  confettiParticles.forEach(p => {
    p.y += p.speed;
    p.x += Math.sin(p.angle) * 0.5;
    p.angle += p.spin * 0.05;

    confettiCtx.fillStyle = p.color;
    confettiCtx.beginPath();
    confettiCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    confettiCtx.fill();

    if (p.y < confettiCanvas.height) stillAlive = true;
  });

  if (stillAlive) {
    requestAnimationFrame(animateConfetti);
  }
}

// ===== Rating System =====
function initRatingSystem() {
  const stars = $$(".star");
  stars.forEach(star => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.dataset.star, 10);
      rateApp(rating);
    });
  });
}

function rateApp(rating) {
  const today = todayKey(now);
  const ratings = loadJSON(k("ratings"), []);

  // Check if already rated today
  const existingIndex = ratings.findIndex(r => r.date === today);
  if (existingIndex >= 0) {
    ratings[existingIndex].rating = rating;
    ratings[existingIndex].timestamp = Date.now();
  } else {
    ratings.push({ date: today, rating, timestamp: Date.now() });
  }

  saveJSON(k("ratings"), ratings);

  // Update UI
  const ratingMessage = $("#ratingMessage");
  ratingMessage.textContent = `Thanks for your ${rating} star rating!`;
  ratingMessage.className = "rating-message success";

  // Show confetti for 5-star ratings
  if (rating === 5) {
    triggerConfetti();
  }

  // Reload rating history if modal is open
  if (ratingHistoryData.length > 0) {
    loadRatingHistory();
  }
}

// ===== Rating History Modal =====
function showRatingHistory() {
  const modal = $("#ratingHistoryModal");
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "block";
  loadRatingHistory();

  // Close button
  $("#closeRatingHistory").onclick = () => {
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
  };

  // Close when clicking outside
  const closeModal = (event) => {
    if (event.target === modal) {
      modal.setAttribute("aria-hidden", "true");
      modal.style.display = "none";
      window.removeEventListener('click', closeModal);
    }
  };
  window.addEventListener('click', closeModal);

  // Search functionality
  $("#ratingHistorySearch").addEventListener("input", (e) => {
    filterRatingHistory(e.target.value);
  });

  // Sort buttons
  $("#sortByDate").addEventListener("click", () => {
    sortRatingHistory("date");
  });

  $("#sortByRating").addEventListener("click", () => {
    sortRatingHistory("rating");
  });

  // Delete all button
  $("#deleteRatingHistory").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all your rating history?")) {
      saveJSON(k("ratings"), []);
      loadRatingHistory();
    }
  });
}

function loadRatingHistory() {
  ratingHistoryData = loadJSON(k("ratings"), []);
  const tableBody = $("#ratingHistoryTableBody");
  const averageRatingEl = $("#averageRating");

  // Calculate average rating
  if (ratingHistoryData.length > 0) {
    const total = ratingHistoryData.reduce((sum, item) => sum + item.rating, 0);
    const average = (total / ratingHistoryData.length).toFixed(1);
    averageRatingEl.textContent = `Average Rating: ${average} (${ratingHistoryData.length} ratings)`;
  } else {
    averageRatingEl.textContent = "Average Rating: N/A";
  }

  // Populate table
  renderRatingHistoryTable(ratingHistoryData, tableBody);
}

function renderRatingHistoryTable(data, tableBody) {
  tableBody.innerHTML = "";

  if (data.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" style="text-align: center; opacity: 0.7;">No rating history yet</td>`;
    tableBody.appendChild(row);
    return;
  }

  data.forEach(item => {
    const row = document.createElement("tr");

    // Format date
    const dateObj = new Date(item.timestamp || (new Date(item.date).getTime()));
    const formattedDate = dateObj.toLocaleDateString();

    // Get emoji for rating
    const emoji = getRatingEmoji(item.rating);

    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${item.rating}/5</td>
      <td>${emoji}</td>
      <td>${item.comment || "-"}</td>
      <td><button class="btn-small edit-rating" data-date="${item.date}">Edit</button></td>
    `;

    tableBody.appendChild(row);
  });

  // Add event listeners to edit buttons
  $$(".edit-rating").forEach(btn => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      editRating(date);
    });
  });
}

function getRatingEmoji(rating) {
  switch (rating) {
    case 1: return "😞";
    case 2: return "😐";
    case 3: return "🙂";
    case 4: return "😊";
    case 5: return "😍";
    default: return "-";
  }
}

function filterRatingHistory(query) {
  const filtered = ratingHistoryData.filter(item => {
    return (
      item.date.includes(query) ||
      String(item.rating).includes(query) ||
      (item.comment && item.comment.toLowerCase().includes(query.toLowerCase()))
    );
  });

  renderRatingHistoryTable(filtered, $("#ratingHistoryTableBody"));
}

function sortRatingHistory(by) {
  const sorted = [...ratingHistoryData].sort((a, b) => {
    if (by === "date") {
      return new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date);
    } else {
      return b.rating - a.rating;
    }
  });

  renderRatingHistoryTable(sorted, $("#ratingHistoryTableBody"));
}

function editRating(date) {
  const ratings = loadJSON(k("ratings"), []);
  const ratingIndex = ratings.findIndex(r => r.date === date);

  if (ratingIndex === -1) return;

  const currentRating = ratings[ratingIndex].rating;
  const currentComment = ratings[ratingIndex].comment || "";

  const newRating = prompt("Edit your rating (1-5):", currentRating);

  if (newRating === null) return; // User cancelled

  if (!newRating || isNaN(newRating) || newRating < 1 || newRating > 5) {
    alert("Please enter a valid rating between 1 and 5");
    return;
  }

  ratings[ratingIndex].rating = parseInt(newRating, 10);
  ratings[ratingIndex].timestamp = Date.now();

  const comment = prompt("Add or edit your comment (optional):", currentComment);
  if (comment !== null) {
    ratings[ratingIndex].comment = comment;
  }

  saveJSON(k("ratings"), ratings);
  loadRatingHistory();
}

// ===== Responsive =====
window.addEventListener("resize", () => {
  if (confettiParticles.length) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  renderCharts(true);
});