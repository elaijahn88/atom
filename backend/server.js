const express = require("express");
const app = express();

app.use(express.json());

// MULTI USERS
let users = {};

// ROOT
app.get("/", (req, res) => {
  res.send("API running 🚀");
});

// CREATE / GET USER
app.post("/user", (req, res) => {
  const { uid, username, balance, frozenBalance } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "UID required" });
  }

  if (!users[uid]) {
    users[uid] = {
      username: username || "Agent",
      balance: balance || 0,
      frozenBalance: frozenBalance || 0,
    };
  }

  res.json(users[uid]);
});

// DEPOSIT
app.post("/deposit", (req, res) => {
  const { uid, amount } = req.body;
  const user = users[uid];

  if (!user) return res.json({ success: false });

  user.balance += amount;

  res.json({ success: true, user });
});

// WITHDRAW
app.post("/withdraw", (req, res) => {
  const { uid, amount } = req.body;
  const user = users[uid];

  if (!user || user.balance < amount) {
    return res.json({ success: false });
  }

  user.balance -= amount;

  res.json({ success: true, user });
});

// FREEZE
app.post("/freeze", (req, res) => {
  const { uid, amount } = req.body;
  const user = users[uid];

  if (!user || user.balance < amount) {
    return res.json({ success: false });
  }

  user.balance -= amount;
  user.frozenBalance += amount;

  res.json({ success: true, user });
});

// UNFREEZE
app.post("/unfreeze", (req, res) => {
  const { uid, amount } = req.body;
  const user = users[uid];

  if (!user || user.frozenBalance < amount) {
    return res.json({ success: false });
  }

  user.frozenBalance -= amount;
  user.balance += amount;

  res.json({ success: true, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running 🚀"));
