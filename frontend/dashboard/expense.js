const API_ORIGIN = "http://localhost:3000";
const LOGIN_PAGE = "../login/login.html";

const CATEGORY_STYLES = {
  Food: { icon: "🍔", color: "#f97316", bg: "#ffedd5" },
  Petrol: { icon: "⛽", color: "#0891b2", bg: "#cffafe" },
  Salary: { icon: "💼", color: "#16a34a", bg: "#dcfce7" },
  Shopping: { icon: "🛍️", color: "#db2777", bg: "#fce7f3" },
  Bills: { icon: "🧾", color: "#ca8a04", bg: "#fef9c3" },
  Travel: { icon: "✈️", color: "#2563eb", bg: "#dbeafe" },
  Entertainment: { icon: "🎬", color: "#9333ea", bg: "#f3e8ff" },
  Health: { icon: "💊", color: "#dc2626", bg: "#fee2e2" },
  Other: { icon: "📦", color: "#4b5563", bg: "#f3f4f6" },
};

function styleFor(category) {
  const key = Object.keys(CATEGORY_STYLES).find(
    (k) => k.toLowerCase() === String(category).toLowerCase()
  );
  const name = key || "Other";
  return { ...CATEGORY_STYLES[name], name: key || category };
}

const token = localStorage.getItem("token");
if (!token) window.location.replace(LOGIN_PAGE);

const form = document.getElementById("expenseForm");
const amountInput = document.getElementById("amount");
const descInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("addBtn");
const formMessage = document.getElementById("formMessage");
const list = document.getElementById("expenseList");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const filterSelect = document.getElementById("filter");
const toastEl = document.getElementById("toast");

let expenses = [];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

document.getElementById("greeting").textContent = `Hi, ${localStorage.getItem("userName") || "there"}`;

Object.keys(CATEGORY_STYLES).forEach((cat) => {
  const opt = document.createElement("option");
  opt.value = cat;
  opt.textContent = `${CATEGORY_STYLES[cat].icon} ${cat}`;
  filterSelect.appendChild(opt);
});

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  window.location.replace(LOGIN_PAGE);
}

document.getElementById("logoutBtn").addEventListener("click", logout);

function api(path, options = {}) {
  return fetchJSON(`/expense${path}`, options);
}

let toastTimer;
function toast(text, type = "success") {
  toastEl.textContent = text;
  toastEl.className = `toast show ${type === "error" ? "error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

function errorMessage(err) {
  return err instanceof TypeError ? "Cannot reach server. Try again later." : err.message;
}

function updateStats() {
  const now = new Date();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const month = expenses
    .filter((e) => {
      const d = new Date(e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  document.getElementById("statTotal").textContent = currency.format(total);
  document.getElementById("statMonth").textContent = currency.format(month);
  document.getElementById("statCount").textContent = expenses.length;
}

function createItem(expense) {
  const style = styleFor(expense.category);

  const li = document.createElement("li");
  li.className = "expense-item";
  li.dataset.id = expense.id;

  const icon = document.createElement("div");
  icon.className = "expense-icon";
  icon.style.background = style.bg;
  icon.textContent = style.icon;

  const info = document.createElement("div");
  info.className = "expense-info";

  const desc = document.createElement("div");
  desc.className = "expense-desc";
  desc.textContent = expense.description;
  desc.title = expense.description;

  const meta = document.createElement("div");
  meta.className = "expense-meta";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.style.background = style.bg;
  badge.style.color = style.color;
  badge.textContent = style.name;

  const date = document.createElement("span");
  date.textContent = dateFmt.format(new Date(expense.createdAt));

  meta.append(badge, date);
  info.append(desc, meta);

  const amount = document.createElement("div");
  amount.className = "expense-amount";
  amount.textContent = currency.format(expense.amount);

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.setAttribute("aria-label", `Delete ${expense.description}`);
  del.title = "Delete";
  del.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  del.addEventListener("click", () => deleteExpense(expense.id, li, del));

  li.append(icon, info, amount, del);
  return li;
}

function render() {
  const filter = filterSelect.value;
  const visible = filter ? expenses.filter((e) => styleFor(e.category).name === filter) : expenses;

  list.replaceChildren(...visible.map(createItem));

  emptyState.classList.toggle("hidden", visible.length > 0);
  emptyState.querySelector("p").textContent = filter ? `No ${filter} expenses` : "No expenses yet";
  emptyState.querySelector("small").textContent = filter
    ? "Try another category."
    : "Add your first expense to get started.";

  updateStats();
}

filterSelect.addEventListener("change", render);

async function loadExpenses() {
  try {
    const data = await api("");
    expenses = data.expenses;
    loadingState.classList.add("hidden");
    render();
  } catch (err) {
    loadingState.textContent = errorMessage(err);
  }
}

function setError(input, message) {
  document.querySelector(`.error[data-for="${input.id}"]`).textContent = message;
  input.classList.toggle("invalid", Boolean(message));
}

[amountInput, descInput, categoryInput].forEach((input) =>
  input.addEventListener("input", () => setError(input, ""))
);

function validate() {
  const amount = Number(amountInput.value);
  const description = descInput.value.trim();
  const category = categoryInput.value;
  let ok = true;

  if (!amountInput.value || !Number.isFinite(amount) || amount <= 0) {
    setError(amountInput, "Enter an amount greater than 0");
    ok = false;
  } else setError(amountInput, "");

  if (!description) {
    setError(descInput, "Description is required");
    ok = false;
  } else setError(descInput, "");

  if (!category) {
    setError(categoryInput, "Choose a category");
    ok = false;
  } else setError(categoryInput, "");

  return ok ? { amount, description, category } : null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.textContent = "";

  const data = validate();
  if (!data) return;

  addBtn.disabled = true;
  addBtn.textContent = "Adding...";

  try {
    const { expense } = await api("", { method: "POST", body: JSON.stringify(data) });
    expenses.unshift(expense);
    render();
    form.reset();
    categoryInput.selectedIndex = 0;
    amountInput.focus();
    toast("Expense added");
  } catch (err) {
    formMessage.textContent = errorMessage(err);
    formMessage.className = "form-message error-msg";
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = "Add expense";
  }
});

async function deleteExpense(id, li, btn) {
  btn.disabled = true;
  try {
    await api(`/${id}`, { method: "DELETE" });
    li.classList.add("removing");
    setTimeout(() => {
      expenses = expenses.filter((e) => e.id !== id);
      render();
    }, 200);
    toast("Expense deleted");
  } catch (err) {
    btn.disabled = false;
    toast(errorMessage(err), "error");
  }
}

const premiumBtn = document.getElementById("premiumBtn");
const premiumBadge = document.getElementById("premiumBadge");
const resultModal = document.getElementById("resultModal");

function setPremium(isPremium) {
  premiumBtn.classList.toggle("hidden", isPremium);
  premiumBadge.classList.toggle("hidden", !isPremium);
}

const RESULT_VIEWS = {
  SUCCESSFUL: {
    icon: "✓",
    cls: "success",
    title: "Transaction successful",
    text: "You are now a premium member. Enjoy the premium features!",
  },
  FAILED: {
    icon: "✕",
    cls: "failed",
    title: "TRANSACTION FAILED",
    text: "Your payment could not be completed. Please try again.",
  },
  PENDING: {
    icon: "…",
    cls: "pending",
    title: "Payment pending",
    text: "We are waiting for confirmation from the bank. Check back in a few minutes.",
  },
};

function showResult(status) {
  const view = RESULT_VIEWS[status] || RESULT_VIEWS.FAILED;
  const icon = document.getElementById("resultIcon");
  icon.textContent = view.icon;
  icon.className = `modal-icon ${view.cls}`;
  document.getElementById("resultTitle").textContent = view.title;
  document.getElementById("resultText").textContent = view.text;
  resultModal.classList.remove("hidden");
  document.getElementById("resultClose").focus();
}

function closeResult() {
  resultModal.classList.add("hidden");
}

document.getElementById("resultClose").addEventListener("click", closeResult);
resultModal.addEventListener("click", (e) => {
  if (e.target === resultModal) closeResult();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeResult();
});

async function verifyOrder(orderId) {
  const { status } = await fetchJSON(`/purchase/status/${encodeURIComponent(orderId)}`);
  if (status === "SUCCESSFUL") setPremium(true);
  showResult(status);
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

premiumBtn.addEventListener("click", async () => {
  if (typeof window.Cashfree !== "function") {
    toast("Payment service failed to load. Check your connection.", "error");
    return;
  }

  premiumBtn.disabled = true;
  try {
    const order = await fetchJSON("/purchase/premium", { method: "POST" });
    const checkout = window.Cashfree({ mode: order.mode });
    const result = await checkout.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: "_modal",
    });

    if (result && result.redirect) return;
    await verifyOrder(order.orderId);
  } catch (err) {
    toast(errorMessage(err), "error");
  } finally {
    premiumBtn.disabled = false;
  }
});

async function loadUser() {
  try {
    const { user } = await fetchJSON("/user/me");
    setPremium(user.isPremium);
  } catch {
    premiumBtn.classList.remove("hidden");
  }
}

async function handleReturnFromPayment() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");
  if (!orderId) return;
  history.replaceState(null, "", window.location.pathname);
  try {
    await verifyOrder(orderId);
  } catch (err) {
    toast(errorMessage(err), "error");
  }
}

loadUser().then(handleReturnFromPayment);
loadExpenses();
