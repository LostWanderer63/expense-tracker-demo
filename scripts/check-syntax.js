// CI check: make sure every server-side .js file parses (node --check).
// Exits non-zero on the first file with a syntax error.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["config", "controllers", "middleware", "migrations", "models", "routes", "services", "utils", "scripts"];

const files = [path.join(ROOT, "index.js")];
for (const dir of DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const name of fs.readdirSync(full)) {
    if (name.endsWith(".js")) files.push(path.join(full, name));
  }
}

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    console.error(`Syntax error in ${path.relative(ROOT, file)}\n${err.stderr}`);
    process.exit(1);
  }
}
console.log(`Syntax OK (${files.length} files)`);
