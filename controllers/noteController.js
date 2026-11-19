const { sequelize } = require("../config/db");
const { Note } = require("../models");

const NOTE_FIELDS = ["id", "noteDate", "text", "createdAt"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LENGTH = 500;

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

async function getNotes(req, res) {
  try {
    const notes = await Note.findAll({
      where: { userId: req.user.id },
      attributes: NOTE_FIELDS,
      order: [
        ["noteDate", "ASC"],
        ["id", "ASC"],
      ],
    });
    return res.status(200).json({ notes });
  } catch (err) {
    console.error("Get notes error:", err);
    return res.status(500).json({ message: "Could not load notes" });
  }
}

async function addNote(req, res) {
  const noteDate = String(req.body.noteDate || "");
  const text = String(req.body.text || "").trim();

  if (!isValidDate(noteDate)) {
    return res.status(400).json({ message: "Pick a valid date" });
  }
  if (!text) {
    return res.status(400).json({ message: "Note is required" });
  }
  if (text.length > MAX_LENGTH) {
    return res.status(400).json({ message: `Note must be under ${MAX_LENGTH} characters` });
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const created = await Note.create({ userId: req.user.id, noteDate, text }, { transaction });
    await transaction.commit();

    const note = await Note.findByPk(created.id, { attributes: NOTE_FIELDS });
    return res.status(201).json({ message: "Note added", note });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Add note error:", err);
    return res.status(500).json({ message: "Could not add note" });
  }
}

async function deleteNote(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid note id" });
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const deleted = await Note.destroy({ where: { id, userId: req.user.id }, transaction });
    await transaction.commit();

    if (!deleted) return res.status(404).json({ message: "Note not found" });
    return res.status(200).json({ message: "Note deleted" });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Delete note error:", err);
    return res.status(500).json({ message: "Could not delete note" });
  }
}

module.exports = { getNotes, addNote, deleteNote };
