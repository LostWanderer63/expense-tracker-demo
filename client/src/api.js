export const API_ORIGIN = "http://localhost:3000";
export const LOGIN_PAGE = "../login/login.html";

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  window.location.replace(LOGIN_PAGE);
}

export async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
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

export function errorMessage(err) {
  return err instanceof TypeError ? "Cannot reach server. Try again later." : err.message;
}

export function isAbort(err) {
  return err && err.name === "AbortError";
}
