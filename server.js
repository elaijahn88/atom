const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔥 FIREBASE INIT (SAFE)
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
  process.exit(1); // stop app if firebase fails
}

// ROOT
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ================= USER =================
app.post("/user", async (req, res) => {
  try {
    const { uid, username, pushToken } = req.body || {};

    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ error: "Valid UID required" });
    }

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      const newUser = {
        username: username || "Agent",
        balance: 0,
        frozenBalance: 0,
        pushToken: pushToken || null,
        createdAt: Date.now(),
      };

      await userRef.set(newUser);
      return res.json(newUser);
    }

    if (pushToken) {
      await userRef.update({ pushToken });
    }

    return res.json(snap.data());
  } catch (err) {
    console.error("USER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ================= TRANSACTION CORE =================
const runTransaction = async (uid, logic) => {
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (t) => {
    const doc = await t.get(userRef);

    if (!doc.exists) throw new Error("User not found");

    const user = doc.data() || {
      balance: 0,
      frozenBalance: 0,
    };

    const updated = await logic({ ...user });

    // prevent NaN corruption
    if (
      typeof updated.balance !== "number" ||
      typeof updated.frozenBalance !== "number"
    ) {
      throw new Error("Invalid balance state");
    }

    t.set(userRef, updated, { merge: true });

    return updated;
  });
};

// ================= VALIDATOR =================
const validate = (uid, amount) => {
  if (!uid || typeof uid !== "string") {
    throw new Error("Invalid UID");
  }

  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
};

// ================= DEPOSIT =================
app.post("/deposit", async (req, res) => {
  try {
    const { uid, amount } = req.body || {};
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      u.balance = (u.balance || 0) + amount;
      return u;
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("DEPOSIT ERROR:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ================= WITHDRAW =================
app.post("/withdraw", async (req, res) => {
  try {
    const { uid, amount } = req.body || {};
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if ((u.balance || 0) < amount) {
        throw new Error("Insufficient funds");
      }

      u.balance -= amount;
      return u;
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("WITHDRAW ERROR:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ================= FREEZE =================
app.post("/freeze", async (req, res) => {
  try {
    const { uid, amount } = req.body || {};
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if ((u.balance || 0) < amount) {
        throw new Error("Insufficient funds");
      }

      u.balance -= amount;
      u.frozenBalance = (u.frozenBalance || 0) + amount;

      return u;
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("FREEZE ERROR:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ================= UNFREEZE =================
app.post("/unfreeze", async (req, res) => {
  try {
    const { uid, amount } = req.body || {};
    validate(uid, amount);

    const user = await runTransaction(uid, (u) => {
      if ((u.frozenBalance || 0) < amount) {
        throw new Error("Insufficient frozen balance");
      }

      u.frozenBalance -= amount;
      u.balance += amount;

      return u;
    });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("UNFREEZE ERROR:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
