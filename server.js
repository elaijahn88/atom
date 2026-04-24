const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 FIREBASE INIT
let db;

try {
  const serviceAccount = require("./servicekey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  console.log("🔥 Firebase connected");
} catch (err) {
  console.error("❌ Firebase init error:", err.message);
  process.exit(1);
}

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.status(200).send("Backend running 🚀");
});

// ================= USER =================
app.post("/user", async (req, res) => {
  try {
    const { uid, username, pushToken } = req.body || {};

    console.log("👉 /user:", uid);

    if (!uid) {
      return res.status(400).json({ error: "UID required" });
    }

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      const newUser = {
        username: username || "Agent",
        balance: 0,
        frozenBalance: 0,
        pushToken: pushToken || null,
        createdAt: Date.now(),
      };

      await ref.set(newUser);
      return res.json(newUser);
    }

    if (pushToken) {
      await ref.update({ pushToken });
    }

    return res.json(snap.data());
  } catch (err) {
    console.error("USER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CORE =================
const validate = (uid, amount) => {
  if (!uid) throw new Error("Invalid UID");
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
};

const runTransaction = async (uid, logic) => {
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    if (!doc.exists) throw new Error("User not found");

    const user = doc.data();
    const updated = await logic({ ...user });

    if (
      typeof updated.balance !== "number" ||
      typeof updated.frozenBalance !== "number"
    ) {
      throw new Error("Invalid balance state");
    }

    t.set(ref, updated, { merge: true });
    return updated;
  });
};

// ================= ROUTES =================
app.post("/deposit", async (req, res) => {
  try {
    const { uid, amount } = req.body;
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      u.balance += amount;
      return u;
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/withdraw", async (req, res) => {
  try {
    const { uid, amount } = req.body;
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if (u.balance < amount) throw new Error("Insufficient funds");
      u.balance -= amount;
      return u;
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/freeze", async (req, res) => {
  try {
    const { uid, amount } = req.body;
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if (u.balance < amount) throw new Error("Insufficient funds");
      u.balance -= amount;
      u.frozenBalance += amount;
      return u;
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/unfreeze", async (req, res) => {
  try {
    const { uid, amount } = req.body;
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if (u
