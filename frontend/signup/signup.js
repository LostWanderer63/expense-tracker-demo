const API_URL = "http://localhost:3000/user/signup";

const form = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
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
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  let ok = true;

  if (!name) {
    setError(nameInput, "Name is required");
    ok = false;
  } else setError(nameInput, "");

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
  } else if (password.length < 6) {
    setError(passwordInput, "Password must be at least 6 characters");
    ok = false;
  } else setError(passwordInput, "");

  return ok ? { name, email, password } : null;
}

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type === "error" ? "error-msg" : "success-msg"}`;
}

[nameInput, emailInput, passwordInput].forEach((input) =>
  input.addEventListener("input", () => setError(input, ""))
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.textContent = "";

  const data = validate();
  if (!data) return;

  signupBtn.disabled = true;
  signupBtn.textContent = "Signing up...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body.message || `Signup failed (${res.status})`);
    }

    showMessage("Signup successful!", "success");
    form.reset();
  } catch (err) {
    showMessage(
      err instanceof TypeError ? "Cannot reach server. Try again later." : err.message,
      "error"
    );
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = "Signup";
  }
});
