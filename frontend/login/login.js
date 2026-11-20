// Served by the same Express app, so API calls go to whatever host the page came from.
const API_ORIGIN = window.location.origin;
const API_URL = `${API_ORIGIN}/user/login`;

if (localStorage.getItem("token")) {
  window.location.replace("../dashboard/expense.html");
}

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const formMessage = document.getElementById("formMessage");
const togglePass = document.getElementById("togglePass");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

togglePass.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePass.textContent = show ? "Hide" : "Show";
  togglePass.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

function setError(input, message) {
  const el = document.querySelector(`.error[data-for="${input.id}"]`);
  el.textContent = message;
  input.classList.toggle("invalid", Boolean(message));
}

function validate() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  let ok = true;

  if (!email) {
    setError(emailInput, "Email is required");
    ok = false;
  } else if (!EMAIL_REGEX.test(email)) {
    setError(emailInput, "Enter a valid email");
    ok = false;
  } else setError(emailInput, "");

  if (!password) {
    setError(passwordInput, "Password is required");
    ok = false;
  } else setError(passwordInput, "");

  return ok ? { email, password } : null;
}

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type === "error" ? "error-msg" : "success-msg"}`;
}

[emailInput, passwordInput].forEach((input) =>
  input.addEventListener("input", () => setError(input, ""))
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.textContent = "";

  const data = validate();
  if (!data) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body.message || `Login failed (${res.status})`);
    }

    localStorage.setItem("token", body.token);
    localStorage.setItem("userName", body.user.name);
    showMessage("Login successful! Redirecting...", "success");
    window.location.href = "../dashboard/expense.html";
  } catch (err) {
    showMessage(
      err instanceof TypeError ? "Cannot reach server. Try again later." : err.message,
      "error"
    );
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

// --- Forgot password ---
const loginView = document.getElementById("loginView");
const forgotView = document.getElementById("forgotView");
const forgotForm = document.getElementById("forgotForm");
const forgotEmailInput = document.getElementById("forgotEmail");
const forgotBtn = document.getElementById("forgotBtn");
const forgotMessage = document.getElementById("forgotMessage");

function showForgotView(show) {
  loginView.classList.toggle("hidden", show);
  forgotView.classList.toggle("hidden", !show);
  if (show) {
    forgotEmailInput.value = emailInput.value.trim();
    setError(forgotEmailInput, "");
    forgotMessage.textContent = "";
    forgotEmailInput.focus();
  } else {
    emailInput.focus();
  }
}

document.getElementById("forgotLink").addEventListener("click", () => showForgotView(true));
document.getElementById("backToLogin").addEventListener("click", () => showForgotView(false));
forgotEmailInput.addEventListener("input", () => setError(forgotEmailInput, ""));

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  forgotMessage.textContent = "";

  const email = forgotEmailInput.value.trim();
  if (!email) return setError(forgotEmailInput, "Email is required");
  if (!EMAIL_REGEX.test(email)) return setError(forgotEmailInput, "Enter a valid email");

  forgotBtn.disabled = true;
  forgotBtn.textContent = "Sending...";

  try {
    const { data } = await axios.post(`${API_ORIGIN}/password/forgotpassword`, { email });
    forgotMessage.textContent =
      data.message || "If an account exists for that email, a reset link has been sent.";
    forgotMessage.className = "form-message success-msg";
    forgotForm.reset();
  } catch (err) {
    forgotMessage.textContent = err.response
      ? err.response.data?.message || `Request failed (${err.response.status})`
      : "Cannot reach server. Try again later.";
    forgotMessage.className = "form-message error-msg";
  } finally {
    forgotBtn.disabled = false;
    forgotBtn.textContent = "Send reset link";
  }
});
