const express = require("express");
const authenticate = require("../middleware/auth");
const { getNotes, addNote, deleteNote } = require("../controllers/noteController");

const router = express.Router();

router.use(authenticate);

router.get("/", getNotes);
router.post("/", addNote);
router.delete("/:id", deleteNote);

module.exports = router;
