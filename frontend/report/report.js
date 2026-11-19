const API_ORIGIN = "http://localhost:3000";
const LOGIN_PAGE = "../login/login.html";
const INCOME_CATEGORIES = ["Salary"];
const VIEWS = ["daily", "weekly", "monthly", "yearly"];
const VIEW_STORAGE_KEY = "reportView";

const token = localStorage.getItem("token");
if (!token) window.location.replace(LOGIN_PAGE);

const tabs = document.querySelectorAll(".view-tab");
const periodLabel = document.getElementById("periodLabel");
const reportHeading = document.getElementById("reportHeading");
const table = document.getElementById("reportTable");
const tableWrap = document.getElementById("tableWrap");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const downloadBtn = document.getElementById("downloadBtn");
const downloadNote = document.getElementById("downloadNote");
const toastEl = document.getElementById("toast");

const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rupees = (n) => `₹ ${money.format(n)}`;
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
const longDayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const monthNameFmt = new Intl.DateTimeFormat("en-IN", { month: "long" });
const stampFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

let entries = [];
let notes = [];
let notesLoaded = false;
let view = readView();
let cursor = startOfDay(new Date());
let isPremium = false;
let currentRows = { columns: [], rows: [] }; // what the table shows, for the download

// ---------- helpers ----------

function readView() {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEWS.includes(saved) ? saved : "monthly";
  } catch {
    return "monthly";
  }
}

function saveView() {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* storage unavailable; view just won't be remembered */
  }
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(startOfDay(d), -day);
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function periodRange() {
  if (view === "daily") return [cursor, addDays(cursor, 1)];
  if (view === "weekly") {
    const start = startOfWeek(cursor);
    return [start, addDays(start, 7)];
  }
  if (view === "monthly") {
    return [
      new Date(cursor.getFullYear(), cursor.getMonth(), 1),
      new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
    ];
  }
  return [new Date(cursor.getFullYear(), 0, 1), new Date(cursor.getFullYear() + 1, 0, 1)];
}

function periodText() {
  const [start, end] = periodRange();
  if (view === "daily") return longDayFmt.format(start);
  if (view === "weekly") return `${shortDayFmt.format(start)} – ${shortDayFmt.format(addDays(end, -1))} ${addDays(end, -1).getFullYear()}`;
  if (view === "monthly") return monthFmt.format(start);
  return String(start.getFullYear());
}

function shift(direction) {
  if (view === "daily") cursor = addDays(cursor, direction);
  else if (view === "weekly") cursor = addDays(cursor, 7 * direction);
  else if (view === "monthly") cursor = new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
  else cursor = new Date(cursor.getFullYear() + direction, 0, 1);
  render();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function row(cells, className) {
  const tr = el("tr", className);
  cells.forEach(([text, cls]) => tr.appendChild(el("td", cls, text)));
  return tr;
}

function header(labels) {
  const thead = el("thead");
  const tr = el("tr");
  labels.forEach(([text, cls]) => {
    const th = el("th", cls, text);
    th.scope = "col";
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  return thead;
}

let toastTimer;
function toast(text, type = "success") {
  toastEl.textContent = text;
  toastEl.className = `toast show ${type === "error" ? "error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

// ---------- rendering ----------

function renderDetail(list) {
  // Group by day, oldest first, like a ledger.
  const byDay = new Map();
  list
    .slice()
    .sort((a, b) => a.date - b.date || a.id - b.id)
    .forEach((e) => {
      const key = dayKey(e.date);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(e);
    });

  const tbody = el("tbody");
  const exportRows = [];
  let totalIncome = 0;
  let totalExpense = 0;

  byDay.forEach((dayEntries) => {
    let dayIncome = 0;
    let dayExpense = 0;
    dayEntries.forEach((e) => {
      const date = dayFmt.format(e.date);
      tbody.appendChild(
        row([
          [date],
          [e.description, "desc"],
          [e.category],
          [e.isIncome ? money.format(e.amount) : "", "num"],
          [e.isIncome ? "" : money.format(e.amount), "num"],
        ])
      );
      exportRows.push([date, e.description, e.category, e.isIncome ? e.amount : "", e.isIncome ? "" : e.amount]);
      if (e.isIncome) dayIncome += e.amount;
      else dayExpense += e.amount;
    });
    tbody.appendChild(
      row([[""], [""], [""], [money.format(dayIncome), "num"], [money.format(dayExpense), "num"]], "subtotal")
    );
    totalIncome += dayIncome;
    totalExpense += dayExpense;
  });

  const tfoot = el("tfoot");
  tfoot.appendChild(
    row(
      [["Total", "label"], [""], [""], [rupees(totalIncome), "num income"], [rupees(totalExpense), "num expense"]],
      "total"
    )
  );
  const savings = el("tr", "savings");
  const savingsCell = el("td", "num", `Savings = ${rupees(totalIncome - totalExpense)}`);
  savingsCell.colSpan = 5;
  savings.appendChild(savingsCell);
  tfoot.appendChild(savings);

  table.replaceChildren(
    header([["Date"], ["Description"], ["Category"], ["Income", "num"], ["Expense", "num"]]),
    tbody,
    tfoot
  );

  exportRows.push(["Total", "", "", totalIncome, totalExpense], ["Savings", "", "", "", totalIncome - totalExpense]);
  currentRows = { columns: ["Date", "Description", "Category", "Income", "Expense"], rows: exportRows };
}

function renderYearly(list, year) {
  const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0, count: 0 }));
  list.forEach((e) => {
    const m = months[e.date.getMonth()];
    m.count += 1;
    if (e.isIncome) m.income += e.amount;
    else m.expense += e.amount;
  });

  const tbody = el("tbody");
  const exportRows = [];
  let income = 0;
  let expense = 0;
  months.forEach((m, i) => {
    if (!m.count) return;
    const name = monthNameFmt.format(new Date(year, i, 1));
    tbody.appendChild(
      row([
        [name],
        [money.format(m.income), "num"],
        [money.format(m.expense), "num"],
        [money.format(m.income - m.expense), "num"],
      ])
    );
    exportRows.push([name, m.income, m.expense, m.income - m.expense]);
    income += m.income;
    expense += m.expense;
  });

  const tfoot = el("tfoot");
  tfoot.appendChild(
    row(
      [
        ["Total", "label"],
        [rupees(income), "num income"],
        [rupees(expense), "num expense"],
        [rupees(income - expense), "num savings-total"],
      ],
      "total"
    )
  );

  table.replaceChildren(
    header([["Month"], ["Income", "num"], ["Expense", "num"], ["Savings", "num"]]),
    tbody,
    tfoot
  );

  exportRows.push(["Total", income, expense, income - expense]);
  currentRows = { columns: ["Month", "Income", "Expense", "Savings"], rows: exportRows };
}

let loaded = false;

function render() {
  tabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  const text = periodText();
  periodLabel.textContent = text;
  reportHeading.textContent = view === "yearly" ? `Yearly Report ${text}` : text;
  document.getElementById("generatedAt").textContent = stampFmt.format(new Date());
  if (!loaded) return;

  const [start, end] = periodRange();
  const list = entries.filter((e) => e.date >= start && e.date < end);

  emptyState.classList.toggle("hidden", list.length > 0);
  tableWrap.classList.toggle("hidden", list.length === 0);
  if (!list.length) {
    currentRows = { columns: [], rows: [] };
  } else if (view === "yearly") {
    renderYearly(list, start.getFullYear());
  } else {
    renderDetail(list);
  }
  renderNotes();
  updateDownloadButton();
}

// ---------- download (premium) ----------

function updateDownloadButton() {
  downloadBtn.disabled = !isPremium || currentRows.rows.length === 0;
  downloadBtn.title = !isPremium
    ? "Download is available for premium members"
    : currentRows.rows.length === 0
      ? "Nothing to download for this period"
      : "Download this report as a CSV file";
  downloadNote.classList.toggle("hidden", isPremium);
}

function csvCell(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

downloadBtn.addEventListener("click", () => {
  if (!isPremium || !currentRows.rows.length) return;
  const periodNotes = notesInPeriod();
  const noteRows = periodNotes.length
    ? [[], ["Notes"], ["Date", "Note"], ...periodNotes.map((n) => [noteDateText(n.noteDate), n.text])]
    : [];
  const lines = [currentRows.columns, ...currentRows.rows, ...noteRows].map((r) =>
    r.map(csvCell).join(",")
  );
  const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = `expenses-${view}-${dayKey(periodRange()[0])}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Report downloaded");
});

// ---------- data ----------

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  window.location.replace(LOGIN_PAGE);
}

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout();
    throw new Error(body.message || "Session expired");
  }
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

async function load() {
  const [expenseResult, userResult, notesResult] = await Promise.allSettled([
    fetchJSON("/expense"),
    fetchJSON("/user/me"),
    fetchJSON("/notes"),
  ]);

  if (userResult.status === "fulfilled") isPremium = Boolean(userResult.value.user.isPremium);
  if (notesResult.status === "fulfilled") {
    notes = notesResult.value.notes;
    notesLoaded = true;
  } else {
    notesState.textContent = `Could not load notes: ${notesResult.reason.message}`;
  }

  if (expenseResult.status === "rejected") {
    const err = expenseResult.reason;
    loadingState.textContent =
      err instanceof TypeError ? "Cannot reach server. Try again later." : err.message;
    return;
  }

  entries = expenseResult.value.expenses.map((e) => ({
    ...e,
    amount: Number(e.amount),
    date: new Date(e.createdAt),
    isIncome: INCOME_CATEGORIES.includes(e.category),
  }));
  loaded = true;
  loadingState.classList.add("hidden");
  render();
}

// ---------- notes ----------

const notesHeading = document.getElementById("notesHeading");
const notesState = document.getElementById("notesState");
const notesWrap = document.getElementById("notesWrap");
const notesBody = document.getElementById("notesBody");
const noteForm = document.getElementById("noteForm");
const noteDateInput = document.getElementById("noteDate");
const noteTextInput = document.getElementById("noteText");
const noteBtn = document.getElementById("noteBtn");
const noteError = document.getElementById("noteError");

let lastNotePeriod = "";

function noteDateText(value) {
  const [y, m, d] = value.split("-");
  return `${d}-${m}-${y}`;
}

function notesInPeriod() {
  const [start, end] = periodRange();
  const from = dayKey(start);
  const to = dayKey(end);
  return notes.filter((n) => n.noteDate >= from && n.noteDate < to);
}

function renderNotes() {
  notesHeading.textContent = `Notes Report ${periodText()}`;

  // When the period changes, default the date box to today if it falls in
  // the period, else the period start.
  const [start, end] = periodRange();
  const periodKey = `${view}:${dayKey(start)}`;
  if (periodKey !== lastNotePeriod) {
    lastNotePeriod = periodKey;
    const today = startOfDay(new Date());
    noteDateInput.value = dayKey(today >= start && today < end ? today : start);
  }

  if (!notesLoaded) {
    notesState.classList.remove("hidden");
    notesWrap.classList.add("hidden");
    return;
  }

  const list = notesInPeriod();
  notesBody.replaceChildren(
    ...list.map((n) => {
      const tr = el("tr");
      tr.appendChild(el("td", "col-date", noteDateText(n.noteDate)));
      tr.appendChild(el("td", "desc", n.text));
      const action = el("td", "col-action");
      const del = el("button", "note-delete", "×");
      del.type = "button";
      del.title = "Delete note";
      del.setAttribute("aria-label", `Delete note: ${n.text}`);
      del.addEventListener("click", () => deleteNote(n.id, del));
      action.appendChild(del);
      tr.appendChild(action);
      return tr;
    })
  );
  notesWrap.classList.toggle("hidden", list.length === 0);
  notesState.classList.toggle("hidden", list.length > 0);
  notesState.textContent = "No notes for this period";
}

function errorText(err) {
  return err instanceof TypeError ? "Cannot reach server. Try again later." : err.message;
}

noteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  noteError.textContent = "";
  const noteDate = noteDateInput.value;
  const text = noteTextInput.value.trim();
  if (!noteDate) return (noteError.textContent = "Pick a date");
  if (!text) return (noteError.textContent = "Write a note first");

  noteBtn.disabled = true;
  try {
    const { note } = await fetchJSON("/notes", {
      method: "POST",
      body: JSON.stringify({ noteDate, text }),
    });
    notes.push(note);
    notes.sort((a, b) => a.noteDate.localeCompare(b.noteDate) || a.id - b.id);
    noteTextInput.value = "";
    renderNotes();
    updateDownloadButton();
    toast("Note added");
  } catch (err) {
    noteError.textContent = errorText(err);
  } finally {
    noteBtn.disabled = false;
  }
});

async function deleteNote(id, btn) {
  btn.disabled = true;
  try {
    await fetchJSON(`/notes/${id}`, { method: "DELETE" });
    notes = notes.filter((n) => n.id !== id);
    renderNotes();
    toast("Note deleted");
  } catch (err) {
    btn.disabled = false;
    toast(errorText(err), "error");
  }
}

// ---------- events ----------

tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    view = tab.dataset.view;
    saveView();
    render();
  })
);
document.getElementById("prevBtn").addEventListener("click", () => shift(-1));
document.getElementById("nextBtn").addEventListener("click", () => shift(1));
document.getElementById("todayBtn").addEventListener("click", () => {
  cursor = startOfDay(new Date());
  render();
});
document.getElementById("logoutBtn").addEventListener("click", logout);

render();
load();
