// ================= IMPORTS =================
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

// ================= APP =================
const app = express();
app.use(express.json());
app.use(cors());

// ================= CONFIG =================
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret";

// ================= FIREBASE =================
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const firestore = admin.firestore(); // users + money
const rtdb = admin.database(); // shared for chat presence

// ================= HELPERS =================
const clean = (v) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, "") : v;

const generateUID = () =>
  "user-" + Math.random().toString(36).slice(2, 10);

const sendPush = async (token, title, body) => {
  if (!token) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });
  } catch {}
};

// ================= TOKENS =================
const generateAccessToken = (user) =>
  jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });

const generateRefreshToken = (user) =>
  jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: "7d" });

// ================= AUTH =================
const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    let { username, pin } = req.body;

    username = clean(username)?.toLowerCase();

    if (!username || !pin || pin.length < 4) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const uid = generateUID();
    const hashedPin = await bcrypt.hash(pin, 10);

    await firestore.collection("users").doc(uid).set({
      uid,
      username,
      pin: hashedPin,
      balance: 100,
      createdAt: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    let { username, pin, pushToken } = req.body;

    username = clean(username)?.toLowerCase();

    const snap = await firestore
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = snap.docs[0].data();

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) {
      return res.status(401).json({ error: "Wrong PIN" });
    }

    if (pushToken) {
      await firestore.collection("users").doc(user.uid).update({
        pushToken,
      });
    }

    const payload = { uid: user.uid, username: user.username };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        uid: user.uid,
        username: user.username,
        balance: user.balance,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SEND MONEY =================
app.post("/send", auth, async (req, res) => {
  try {
    const { toUid, amount } = req.body;
    const fromUid = req.user.uid;

    const value = Number(amount);

    const senderRef = firestore.collection("users").doc(fromUid);
    const receiverRef = firestore.collection("users").doc(toUid);

    await firestore.runTransaction(async (t) => {
      const s = await t.get(senderRef);
      const r = await t.get(receiverRef);

      if (!s.exists) throw new Error("Sender not found");
      if (s.data().balance < value)
        throw new Error("Insufficient balance");

      t.update(senderRef, {
        balance: s.data().balance - value,
      });

      t.update(receiverRef, {
        balance: (r.data()?.balance || 0) + value,
      });
    });

    // 🔔 OPTIONAL: notify chat presence
    await rtdb.ref("presence/" + toUid).update({
      lastTransaction: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("🚀 Main API running"));
