// Small CSV builder. Text cells that start with = + - @ are prefixed with '
// so spreadsheet apps don't run user-entered text as a formula.
function cell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  // BOM so Excel opens the file as UTF-8 (₹, accented names, etc.).
  return `﻿${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

module.exports = { toCsv };
