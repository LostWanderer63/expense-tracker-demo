require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { initDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.redirect("/login/login.html"));
app.use(express.static(path.join(__dirname, "frontend")));

app.use("/user", userRoutes);
app.use("/expense", expenseRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MySQL:", err.message);
    process.exit(1);
  });
