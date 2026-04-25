const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
});

const db = admin.firestore();

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
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
      }),
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

  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    let { username, pin } = req.body;

    username = clean(username);

    if (!username || !pin || pin.length < 4) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const uid = generateUID();
    const hashedPin = await bcrypt.hash(pin, 10);

    await db.collection("users").doc(uid).set({
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

    username = clean(username);

    const snap = await db
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
      await db.collection("users").doc(user.uid).update({
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
        username: user.username,
        balance: user.balance,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= REFRESH =================
app.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const newAccessToken = generateAccessToken({
      uid: decoded.uid,
      username: decoded.username,
    });

    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ================= ME =================
app.get("/me", auth, async (req, res) => {
  const doc = await db.collection("users").doc(req.user.uid).get();
  res.json({ user: doc.data() });
});

// ================= SEND =================
app.post("/send", auth, async (req, res) => {
  try {
    const { toUid, amount } = req.body;
    const fromUid = req.user.uid;

    const value = Number(amount);

    if (!toUid || value <= 0) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const senderRef = db.collection("users").doc(fromUid);
    const receiverRef = db.collection("users").doc(toUid);

    await db.runTransaction(async (t) => {
      const s = await t.get(senderRef);
      const r = await t.get(receiverRef);

      if (!s.exists) throw new Error("Sender not found");

      if (s.data().balance < value) {
        throw new Error("Insufficient balance");
      }

      if (!r.exists) {
        t.set(receiverRef, {
          uid: toUid,
          username: "New User",
          balance: 0,
        });
      }

      t.update(senderRef, {
        balance: s.data().balance - value,
      });

      t.update(receiverRef, {
        balance: (r.data()?.balance || 0) + value,
      });
    });

    const txRef = db.collection("transactions").doc();

    const receipt = {
      id: txRef.id,
      fromUid,
      toUid,
      amount: value,
      reference: "TX-" + Date.now(),
      createdAt: Date.now(),
    };

    await txRef.set(receipt);

    const sender = (await senderRef.get()).data();
    const receiver = (await receiverRef.get()).data();

    await sendPush(
      receiver.pushToken,
      "💰 Money Received",
      `UGX ${value} received from ${sender.username}`
    );

    await sendPush(
      sender.pushToken,
      "📤 Money Sent",
      `UGX ${value} sent to ${receiver.username}`
    );

    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= TRANSACTIONS =================
app.get("/transactions", auth, async (req, res) => {
  try {
    const uid = req.user.uid;

    const sent = await db
      .collection("transactions")
      .where("fromUid", "==", uid)
      .get();

    const received = await db
      .collection("transactions")
      .where("toUid", "==", uid)
      .get();

    const txs = [];

    sent.forEach((d) => txs.push(d.data()));
    received.forEach((d) => txs.push(d.data()));

    txs.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ transactions: txs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("🚀 Server running"));
