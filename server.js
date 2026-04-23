const express = require("express");

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Hello from coco 🇺🇬");
});

// GET API
app.get("/api/users", (req, res) => {
  const users = [
    { id: 1, name: "Coco" },
    { id: 2, name: "John" },
  ];
  res.json(users);
});

// POST API
app.post("/api/users", (req, res) => {
  const newUser = req.body;
  res.json({
    message: "User created successfully",
    user: newUser,
  });
});

// Dynamic route
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  res.json({
    id: userId,
    name: "Sample User",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
