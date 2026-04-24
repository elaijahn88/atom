const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔥 FIREBASE INIT
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

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
  const { uid, username } = req.body;

  if (!uid) return res.status(400).json({ error: "UID required" });

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
});

// DEPOSIT
app.post("/deposit", async (req, res) => {
  const { uid, amount } = req.body;

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (t) => {
    const doc = await t.get(userRef);
    if (!doc.exists) throw "User not found";

    const user = doc.data();
    user.balance += amount;

    t.update(userRef, user);

    res.json({ success: true, user });
  }).catch(() => res.json({ success: false }));
});

// WITHDRAW
app.post("/withdraw", async (req, res) => {
  const { uid, amount } = req.body;

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (t) => {
    const doc = await t.get(userRef);
    if (!doc.exists) throw "User not found";

    const user = doc.data();

    if (user.balance < amount) throw "Insufficient";

    user.balance -= amount;

    t.update(userRef, user);

    res.json({ success: true, user });
  }).catch(() => res.json({ success: false }));
});

// FREEZE
app.post("/freeze", async (req, res) => {
  const { uid, amount } = req.body;

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (t) => {
    const doc = await t.get(userRef);
    if (!doc.exists) throw "User not found";

    const user = doc.data();

    if (user.balance < amount) throw "Insufficient";

    user.balance -= amount;
    user.frozenBalance += amount;

    t.update(userRef, user);

    res.json({ success: true, user });
  }).catch(() => res.json({ success: false }));
});

// UNFREEZE
app.post("/unfreeze", async (req, res) => {
  const { uid, amount } = req.body;

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (t) => {
    const doc = await t.get(userRef);
    if (!doc.exists) throw "User not found";

    const user = doc.data();

    if (user.frozenBalance < amount) throw "Insufficient";

    user.frozenBalance -= amount;
    user.balance += amount;

    t.update(userRef, user);

    res.json({ success: true, user });
  }).catch(() => res.json({ success: false }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running 🚀"));
