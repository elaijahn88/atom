const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ================= FIREBASE INIT =================
let db = null;

try {
  if (process.env.FIREBASE_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    console.log("🔥 Firebase connected");
  } else {
    console.warn("⚠️ No FIREBASE_KEY → fallback mode");
  }
} catch (err) {
  console.error("❌ Firebase init failed:", err.message);
}

// ================= HELPERS =================
const safeUser = (u = {}) => ({
  username: u.username || "Agent",
  balance: Number(u.balance || 0),
  frozenBalance: Number(u.frozenBalance || 0),
  pushToken: u.pushToken || null,
  createdAt: u.createdAt || Date.now(),
});

// fallback if DB missing
const fallbackUser = () => ({
  success: true,
  user: safeUser(),
  warning: "Running without database",
});

// ================= HEALTH =================
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ================= USER =================
app.post("/user", async (req, res) => {
  try {
    if (!db) return res.json(fallbackUser());

    const { uid, username, pushToken } = req.body || {};

    if (!uid) {
      return res.status(400).json({ success: false, error: "UID required" });
    }

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    let user;

    if (!snap.exists) {
      user = safeUser({ username, pushToken });
      await ref.set(user);
    } else {
      user = safeUser(snap.data());

      if (pushToken) {
        await ref.update({ pushToken });
        user.pushToken = pushToken;
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ USER ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= TRANSACTIONS =================
const validate = (uid, amount) => {
  if (!uid) throw new Error("Invalid UID");
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount");
  }
};

const runTransaction = async (uid, logic) => {
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    if (!doc.exists) throw new Error("User not found");

    let user = safeUser(doc.data());
    const updated = await logic({ ...user });

    t.set(ref, updated, { merge: true });
    return updated;
  });
};

const handle = async (req, res, logic) => {
  try {
    if (!db) return res.json(fallbackUser());

    const { uid, amount } = req.body;
    validate(uid, amount);

    const user = await runTransaction(uid, logic);
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ ACTION ERROR:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

app.post("/deposit", (req, res) =>
  handle(req, res, (u) => {
    u.balance += req.body.amount;
    return u;
  })
);

app.post("/withdraw", (req, res) =>
  handle(req, res, (u) => {
    if (u.balance < req.body.amount) throw new Error("Insufficient funds");
    u.balance -= req.body.amount;
    return u;
  })
);

app.post("/freeze", (req, res) =>
  handle(req, res, (u) => {
    if (u.balance < req.body.amount) throw new Error("Insufficient funds");
    u.balance -= req.body.amount;
    u.frozenBalance += req.body.amount;
    return u;
  })
);

app.post("/unfreeze", (req, res) =>
  handle(req, res, (u) => {
    if (u.frozenBalance < req.body.amount)
      throw new Error("Insufficient frozen");
    u.frozenBalance -= req.body.amount;
    u.balance += req.body.amount;
    return u;
  })
);

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});
