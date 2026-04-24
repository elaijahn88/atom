const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ================= FIREBASE INIT =================
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
  // ❌ DON'T crash server on Render
}

// ================= HEALTH =================
app.get("/", (req, res) => {
  res.status(200).send("Backend running 🚀");
});

// ================= HELPERS =================
const validate = (uid, amount) => {
  if (!uid) throw new Error("Invalid UID");
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
};

const safeUser = (u = {}) => ({
  username: u.username || "Agent",
  balance: Number(u.balance || 0),
  frozenBalance: Number(u.frozenBalance || 0),
  pushToken: u.pushToken || null,
  createdAt: u.createdAt || Date.now(),
});

const runTransaction = async (uid, logic) => {
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (t) => {
    const doc = await t.get(ref);

    if (!doc.exists) throw new Error("User not found");

    let user = safeUser(doc.data());

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

// ================= USER =================
app.post("/user", async (req, res) => {
  try {
    const { uid, username, pushToken } = req.body || {};

    console.log("👉 /user:", uid);

    if (!uid) {
      return res.status(400).json({ success: false, error: "UID required" });
    }

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    let user;

    if (!snap.exists) {
      user = safeUser({
        username,
        pushToken,
      });

      await ref.set(user);
    } else {
      user = safeUser(snap.data());

      if (pushToken) {
        await ref.update({ pushToken });
        user.pushToken = pushToken;
      }
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("❌ USER ERROR:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

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
    console.error("❌ DEPOSIT ERROR:", err.message);
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
    console.error("❌ WITHDRAW ERROR:", err.message);
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
    console.error("❌ FREEZE ERROR:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/unfreeze", async (req, res) => {
  try {
    const { uid, amount } = req.body;
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if (u.frozenBalance < amount) throw new Error("Insufficient frozen");
      u.frozenBalance -= amount;
      u.balance += amount;
      return u;
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ UNFREEZE ERROR:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});
