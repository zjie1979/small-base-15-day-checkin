const STORAGE_KEY = "smallBase15.original.v1";
const DAY_COUNT = 15;

const TASKS = [
  { id: "breakfast", label: "早餐", detail: "一个鸡蛋＋一杯无糖饮品", icon: "🥚" },
  { id: "lunch", label: "午餐", detail: "双吉汉堡，或 2拳菜＋1拳肉＋1拳饭", icon: "🍔", choice: "lunch" },
  { id: "snack", label: "下午", detail: "冰拿铁＋适量坚果", icon: "☕️" },
  { id: "dinner", label: "晚餐", detail: "小香蕉／鸡蛋／玉米，三选一", icon: "🍌", choice: "dinner" },
  { id: "water", label: "喝水", detail: "全天累计 1.5L", icon: "💧" },
  { id: "sleep", label: "睡眠", detail: "23:30 前睡觉", icon: "🌙" },
  { id: "stretch", label: "拉伸", detail: "睡前完成拉伸", icon: "🧘" }
];

const CHOICES = {
  lunch: [
    { value: "burger", label: "麦门双吉汉堡（去芝士、去酱）" },
    { value: "fists", label: "两拳蔬菜＋一拳肉＋一拳饭" }
  ],
  dinner: [
    { value: "banana", label: "小香蕉" },
    { value: "egg", label: "鸡蛋" },
    { value: "corn", label: "玉米" }
  ]
};

const todayKey = () => localDateKey(new Date());
const defaultState = () => ({ version: 1, startDate: todayKey(), unit: "jin", days: {}, weights: {} });

let state = loadState();
let selectedDay = currentProgramDay();
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 1 && saved.days && saved.weights) return saved;
  } catch (_) {}
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(key) {
  return new Date(`${key}T00:00:00`);
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function dayDate(index) {
  return addDays(dateFromKey(state.startDate), index);
}

function dayDateLabel(index, includeYear = false) {
  const date = dayDate(index);
  return `${includeYear ? `${date.getFullYear()}年` : ""}${date.getMonth() + 1}月${date.getDate()}日`;
}

function currentProgramDay() {
  const start = dateFromKey(state.startDate);
  const today = dateFromKey(todayKey());
  const diff = Math.floor((today - start) / 86400000);
  return Math.min(DAY_COUNT - 1, Math.max(0, diff));
}

function ensureDay(index) {
  if (!state.days[index]) state.days[index] = { checks: {}, choices: {} };
  if (!state.days[index].checks) state.days[index].checks = {};
  if (!state.days[index].choices) state.days[index].choices = {};
  return state.days[index];
}

function dayCompleted(index) {
  const day = ensureDay(index);
  return TASKS.every((task) => day.checks[task.id] === true);
}

function completedDays() {
  return Array.from({ length: DAY_COUNT }, (_, index) => dayCompleted(index)).filter(Boolean).length;
}

function renderAll() {
  renderHeader();
  renderDayGrid();
  renderPlan();
  renderWeight();
  renderProgress();
}

function renderHeader() {
  const done = completedDays();
  const percent = Math.round((done / DAY_COUNT) * 100);
  const start = dayDate(0);
  const end = dayDate(DAY_COUNT - 1);
  $("#phaseLabel").textContent = `第 ${selectedDay + 1} 天 · 已完成 ${done}/${DAY_COUNT}`;
  $("#dateRange").textContent = `${start.getMonth() + 1}.${start.getDate()} — ${end.getMonth() + 1}.${end.getDate()}`;
  $("#progressValue").textContent = `${percent}%`;
  $("#progressOrbit").style.setProperty("--progress", `${percent * 3.6}deg`);
  $("#progressText").textContent = done ? `已完成 ${done} 天，继续按身体情况调整` : "从今天开始，按身体情况调整";
}

function renderDayGrid() {
  const current = currentProgramDay();
  $("#dayGrid").innerHTML = Array.from({ length: DAY_COUNT }, (_, index) => {
    const done = dayCompleted(index);
    const classes = ["day-button", selectedDay === index ? "active" : "", current === index ? "current" : "", done ? "done" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-day="${index}" aria-label="第${index + 1}天${done ? "，已完成" : ""}"><span>${index + 1}</span><small>${dayDateLabel(index)}</small></button>`;
  }).join("");

  $$(".day-button").forEach((button) => button.addEventListener("click", () => {
    selectedDay = Number(button.dataset.day);
    renderAll();
    window.scrollTo({ top: 126, behavior: "smooth" });
  }));
}

function choiceMarkup(task, day) {
  if (!task.choice) return "";
  return `<div class="choice-row" role="radiogroup" aria-label="${task.label}选择">${CHOICES[task.choice].map((choice) => `
    <label class="choice-chip">
      <input type="radio" name="${task.choice}-${selectedDay}" data-choice="${task.choice}" value="${choice.value}" ${day.choices[task.choice] === choice.value ? "checked" : ""}>
      <span>${choice.label}</span>
    </label>`).join("")}</div>`;
}

function renderPlan() {
  const day = ensureDay(selectedDay);
  $("#dayTitle").textContent = `第 ${selectedDay + 1} 天`;
  $("#dayDate").textContent = dayDateLabel(selectedDay, true);
  $("#weightTitle").textContent = `第 ${selectedDay + 1} 天体重`;
  $("#mealList").innerHTML = TASKS.map((task) => `
    <div class="meal-item ${day.checks[task.id] ? "checked" : ""}">
      <label class="meal-check">
        <input type="checkbox" data-task="${task.id}" ${day.checks[task.id] ? "checked" : ""}>
        <span class="task-check">✓</span>
        <span class="meal-icon" aria-hidden="true">${task.icon}</span>
        <span class="meal-copy"><b>${task.label}</b><small>${task.detail}</small></span>
      </label>
      ${choiceMarkup(task, day)}
    </div>`).join("");

  $("#dayCount").textContent = `${TASKS.filter((task) => day.checks[task.id]).length}/${TASKS.length}`;

  $$("#mealList [data-task]").forEach((input) => input.addEventListener("change", () => {
    ensureDay(selectedDay).checks[input.dataset.task] = input.checked;
    saveState();
    const justCompleted = dayCompleted(selectedDay);
    renderAll();
    if (justCompleted) showToast(`第 ${selectedDay + 1} 天完成 ✓`);
  }));

  $$("#mealList [data-choice]").forEach((input) => input.addEventListener("change", () => {
    const dayState = ensureDay(selectedDay);
    dayState.choices[input.dataset.choice] = input.value;
    dayState.checks[input.dataset.choice] = true;
    saveState();
    renderAll();
    showToast("选择已记录");
  }));
}

function displayWeight(kg) {
  return state.unit === "jin" ? (kg * 2).toFixed(1) : kg.toFixed(1);
}

function weightUnit() {
  return state.unit === "jin" ? "斤" : "kg";
}

function renderWeight() {
  $$("[data-unit]").forEach((button) => button.classList.toggle("active", button.dataset.unit === state.unit));
  const weight = state.weights[selectedDay];
  const shown = weight ? displayWeight(weight.kg) : "";
  $("#weightContent").innerHTML = `
    <form class="weight-form" id="weightForm">
      <label class="weight-input-wrap">
        <input id="weightInput" type="number" inputmode="decimal" step="0.1" min="20" max="600" value="${shown}" placeholder="例如 108.6" aria-label="输入第${selectedDay + 1}天体重">
        <span>${weightUnit()}</span>
      </label>
      <button class="primary-button" type="submit">${weight ? "保存修改" : "记录"}</button>
    </form>
    <p class="microcopy">体重可不填；尽量固定在早晨起床、如厕后记录。</p>`;

  $("#weightForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = Number($("#weightInput").value);
    const kg = state.unit === "jin" ? raw / 2 : raw;
    if (!Number.isFinite(kg) || kg < 20 || kg > 300) {
      showToast("请检查体重数字");
      return;
    }
    state.weights[selectedDay] = { kg: Number(kg.toFixed(2)), recordedAt: todayKey() };
    saveState();
    renderAll();
    showToast("体重已记录");
  });
}

function weightEntries() {
  return Object.entries(state.weights)
    .map(([index, weight]) => ({ index: Number(index), ...weight }))
    .filter((entry) => Number.isFinite(entry.kg))
    .sort((a, b) => a.index - b.index);
}

function renderProgress() {
  const done = completedDays();
  const weights = weightEntries();
  $("#progressSubtitle").textContent = `完成 ${done}/${DAY_COUNT} 天 · 日期 ${dayDateLabel(0)}—${dayDateLabel(DAY_COUNT - 1)}`;

  if (weights.length) {
    const first = weights[0];
    const latest = weights[weights.length - 1];
    $("#startWeight").textContent = `${displayWeight(first.kg)} ${weightUnit()}`;
    $("#startWeightDay").textContent = `第 ${first.index + 1} 天`;
    $("#latestWeight").textContent = `${displayWeight(latest.kg)} ${weightUnit()}`;
    if (weights.length > 1) {
      const deltaKg = latest.kg - first.kg;
      const delta = state.unit === "jin" ? deltaKg * 2 : deltaKg;
      $("#weightDelta").textContent = `较首次 ${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${weightUnit()}`;
    } else {
      $("#weightDelta").textContent = "等待第二次记录";
    }
  } else {
    $("#startWeight").textContent = "—";
    $("#startWeightDay").textContent = "尚未记录";
    $("#latestWeight").textContent = "—";
    $("#weightDelta").textContent = "等待记录";
  }

  $("#progressList").innerHTML = Array.from({ length: DAY_COUNT }, (_, index) => {
    const day = ensureDay(index);
    const count = TASKS.filter((task) => day.checks[task.id]).length;
    const doneDay = dayCompleted(index);
    const weight = state.weights[index];
    return `<button type="button" class="progress-item card ${doneDay ? "done" : ""}" data-open-day="${index}">
      <span class="progress-number">${doneDay ? "✓" : index + 1}</span>
      <span class="progress-copy"><b>第 ${index + 1} 天</b><small>${dayDateLabel(index)} · ${count}/${TASKS.length} 项</small></span>
      <span class="progress-weight">${weight ? `${displayWeight(weight.kg)} ${weightUnit()}` : "—"}</span>
    </button>`;
  }).join("");

  $$("[data-open-day]").forEach((button) => button.addEventListener("click", () => {
    selectedDay = Number(button.dataset.openDay);
    switchView("today");
    renderAll();
  }));
}

function switchView(name) {
  $$(".view").forEach((view) => {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle("active", active);
  });
  $$(".bottom-nav button").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
  if (name === "progress") renderProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

$$(".bottom-nav button").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.tab)));

$$("[data-unit]").forEach((button) => button.addEventListener("click", () => {
  state.unit = button.dataset.unit;
  saveState();
  renderWeight();
  renderProgress();
}));

const startDialog = $("#startDialog");
const installDialog = $("#installDialog");

$("#changeStartBtn").addEventListener("click", () => {
  $("#startDateInput").value = state.startDate;
  startDialog.showModal();
});

$("#startForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = $("#startDateInput").value;
  if (!value) return;
  state.startDate = value;
  selectedDay = currentProgramDay();
  saveState();
  startDialog.close();
  renderAll();
  showToast("开始日期已更新");
});

$("#installHelpBtn").addEventListener("click", () => installDialog.showModal());

$$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => {
  document.getElementById(button.dataset.closeDialog).close();
}));

[startDialog, installDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

$("#clearDataBtn").addEventListener("click", () => {
  if (!window.confirm("确定清空全部日期、打卡和体重记录吗？此操作无法恢复。")) return;
  state = defaultState();
  selectedDay = 0;
  saveState();
  renderAll();
  switchView("today");
  showToast("数据已清空");
});

renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
