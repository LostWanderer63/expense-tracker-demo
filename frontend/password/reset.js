const form = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const resetBtn = document.getElementById("resetBtn");
const formMessage = document.getElementById("formMessage");
const loginLink = document.getElementById("loginLink");
const requestId = form.dataset.requestId;
const MIN_LENGTH = Number(passwordInput.getAttribute("minlength")) || 6;

function setError(input, message) {
  document.querySelector(`.error[data-for="${input.id}"]`).textContent = message;
  input.classList.toggle("invalid", Boolean(message));
}

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type === "error" ? "error-msg" : "success-msg"}`;
}

[passwordInput, confirmInput].forEach((input) =>
  input.addEventListener("input", () => setError(input, ""))
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.textContent = "";

  const password = passwordInput.value;
  let ok = true;
  if (password.length < MIN_LENGTH) {
    setError(passwordInput, `Password must be at least ${MIN_LENGTH} characters`);
    ok = false;
  }
  if (confirmInput.value !== password) {
    setError(confirmInput, "Passwords do not match");
    ok = false;
  }
  if (!ok) return;

  resetBtn.disabled = true;
  resetBtn.textContent = "Updating...";

  try {
    const res = await fetch(`/password/updatepassword/${encodeURIComponent(requestId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);

    showMessage(body.message || "Password updated. You can now log in.", "success");
    form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    loginLink.classList.remove("hidden");
    loginLink.focus();
  } catch (err) {
    showMessage(
      err instanceof TypeError ? "Cannot reach server. Try again later." : err.message,
      "error"
    );
    resetBtn.disabled = false;
  } finally {
    resetBtn.textContent = "Update password";
  }
});
