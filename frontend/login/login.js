const API_URL = "http://localhost:3000/user/login";

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
