require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { initDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "frontend")));

app.use("/user", userRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MySQL:", err.message);
    process.exit(1);
  });
