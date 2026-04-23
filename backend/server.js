const express = require("express");
const app = express();

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("API running 🚀");
});

// Fake in-memory user
let user = {
  username: "Elijah",
  balance: 0,
  frozenBalance: 0,
};

// GET USER
app.get("/user", (req, res) => {
  res.json(user);
});

// DEPOSIT
app.post("/deposit", (req, res) => {
  const { amount } = req.body;
  user.balance += amount;
  res.json({ success: true, user });
});

// WITHDRAW
app.post("/withdraw", (req, res) => {
  const { amount } = req.body;
  if (user.balance < amount) {
    return res.json({ success: false });
  }
  user.balance -= amount;
  res.json({ success: true, user });
});

// FREEZE
app.post("/freeze", (req, res) => {
  const { amount } = req.body;
  if (user.balance < amount) {
    return res.json({ success: false });
  }
  user.balance -= amount;
  user.frozenBalance += amount;
  res.json({ success: true, user });
});

// UNFREEZE
app.post("/unfreeze", (req, res) => {
  const { amount } = req.body;
  if (user.frozenBalance < amount) {
    return res.json({ success: false });
  }
  user.frozenBalance -= amount;
  user.balance += amount;
  res.json({ success: true, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
