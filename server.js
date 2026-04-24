const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔥 FIREBASE INIT (using local file)
const serviceAccount = require("./servicekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ROOT
app.get("/", (req, res) => {
  res.send("Elijah....🚀");
});

// CREATE / GET USER
app.post("/user", async (req, res) => {
  try {
    const { uid, username } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "UID required" });
    }

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      const newUser = {
        username: username || "Agent",
        balance: 0,
        frozenBalance: 0,
      };

      await userRef.set(newUser);
      return res.json(newUser);
    }

    res.json(snap.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DEPOSIT
app.post("/deposit", async (req, res) => {
  try {
    const { uid, amount } = req.body;

    if (!uid || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error("User not found");

      const user = doc.data();
      user.balance += amount;

      t.update(userRef, user);

      res.json({ success: true, user });
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// WITHDRAW
app.post("/withdraw", async (req, res) => {
  try {
    const { uid, amount } = req.body;

    if (!uid || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error("User not found");

      const user = doc.data();

      if (user.balance < amount) throw new Error("Insufficient funds");

      user.balance -= amount;

      t.update(userRef, user);

      res.json({ success: true, user });
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// FREEZE
app.post("/freeze", async (req, res) => {
  try {
    const { uid, amount } = req.body;

    if (!uid || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error("User not found");

      const user = doc.data();

      if (user.balance < amount) throw new Error("Insufficient funds");

      user.balance -= amount;
      user.frozenBalance += amount;

      t.update(userRef, user);

      res.json({ success: true, user });
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// UNFREEZE
app.post("/unfreeze", async (req, res) => {
  try {
    const { uid, amount } = req.body;

    if (!uid || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error("User not found");

      const user = doc.data();

      if (user.frozenBalance < amount)
        throw new Error("Insufficient frozen balance");

      user.frozenBalance -= amount;
      user.balance += amount;

      t.update(userRef, user);

      res.json({ success: true, user });
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
