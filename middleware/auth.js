const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.userId, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

module.exports = authenticate;
