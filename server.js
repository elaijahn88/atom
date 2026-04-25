// ================= IMPORTS =================
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

// ================= APP =================
const app = express();
app.use(express.json());
app.use(cors());

// ================= SECURITY =================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

// ================= FIREBASE =================
if (!process.env.FIREBASE_KEY) {
  throw new Error("FIREBASE_KEY missing");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.database();
const bucket = admin.storage().bucket();

// ================= MIDDLEWARE =================
const upload = multer({ storage: multer.memoryStorage() });

const limiter = rateLimit({
  windowMs: 10 * 1000,
  max: 25,
});
app.use(limiter);

// ================= HELPERS =================
const clean = (v) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, "") : v;

const generateUID = () =>
  "user-" + Math.random().toString(36).slice(2, 10);

const getChatId = (a, b) => [a, b].sort().join("_");

const sendPush = async (token, title, body) => {
  if (!token) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });
  } catch (err) {
    console.error("Push failed:", err.message);
  }
};

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

// ================= LOGIN (AUTO REGISTER) =================
app.post("/login", async (req, res) => {
  try {
    let { username, pin, pushToken } = req.body;

    username = clean(username)?.toLowerCase();

    if (!username || !pin || pin.length < 4) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const snap = await db
      .ref("users")
      .orderByChild("usernameKey")
      .equalTo(username)
      .once("value");

    let user;

    // ===== CREATE USER IF NOT EXISTS =====
    if (!snap.exists()) {
      const uid = generateUID();
      const hashedPin = await bcrypt.hash(pin, 10);

      user = {
        uid,
        username,
        usernameKey: username,
        pin: hashedPin,
        pushToken: pushToken || null,
        createdAt: Date.now(),
      };

      await db.ref("users/" + uid).set(user);
    } else {
      // ===== LOGIN EXISTING USER =====
      const data = snap.val();
      user = Object.values(data)[0];

      const valid = await bcrypt.compare(pin, user.pin);
      if (!valid) {
        return res.status(401).json({ error: "Wrong PIN" });
      }

      if (pushToken) {
        await db.ref("users/" + user.uid).update({ pushToken });
      }
    }

    const token = jwt.sign(
      { uid: user.uid, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SEND MESSAGE =================
app.post("/send-message", auth, async (req, res) => {
  try {
    const { toUid, text, type = "text" } = req.body;
    const fromUid = req.user.uid;

    if (!toUid || !text?.trim()) {
      return res.status(400).json({ error: "Missing data" });
    }

    const chatId = getChatId(fromUid, toUid);
    const msgRef = db.ref(`chats/${chatId}/messages`).push();

    const message = {
      id: msgRef.key,
      from: fromUid,
      to: toUid,
      text: text.trim(),
      type,
      seen: false,
      createdAt: Date.now(),
    };

    await msgRef.set(message);

    const meta = {
      lastMessage:
        type === "text" ? text.trim().slice(0, 100) : "📎 File",
      lastSender: fromUid,
      updatedAt: Date.now(),
    };

    await db.ref(`chats/${chatId}/meta`).update(meta);

    await db.ref(`userChats/${fromUid}/${chatId}`).update({
      chatId,
      with: toUid,
      ...meta,
    });

    await db.ref(`userChats/${toUid}/${chatId}`).update({
      chatId,
      with: fromUid,
      ...meta,
    });

    // ===== PUSH =====
    const receiverSnap = await db.ref("users/" + toUid).once("value");
    const senderSnap = await db.ref("users/" + fromUid).once("value");

    const receiver = receiverSnap.val();
    const sender = senderSnap.val();

    await sendPush(
      receiver?.pushToken,
      "💬 New Message",
      `${sender?.username || "Someone"}: ${meta.lastMessage}`
    );

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET CHATS =================
app.get("/chats", auth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await db.ref("userChats/" + uid).once("value");

    const chats = [];
    snap.forEach((c) => chats.push(c.val()));

    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SEEN =================
app.post("/seen/:chatId", auth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const chatId = req.params.chatId;

    const snap = await db.ref(`chats/${chatId}/messages`).once("value");
    const updates = {};

    snap.forEach((msg) => {
      const m = msg.val();
      if (m.to === uid && !m.seen) {
        updates[`${msg.key}/seen`] = true;
      }
    });

    if (Object.keys(updates).length) {
      await db.ref(`chats/${chatId}/messages`).update(updates);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= TYPING =================
app.post("/typing", auth, async (req, res) => {
  try {
    const { toUid, typing } = req.body;
    const fromUid = req.user.uid;
    const chatId = getChatId(fromUid, toUid);

    await db.ref(`typing/${chatId}/${fromUid}`).set({
      typing: !!typing,
      updatedAt: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PRESENCE =================
app.post("/presence", auth, async (req, res) => {
  try {
    const uid = req.user.uid;

    await db.ref("presence/" + uid).set({
      online: true,
      lastSeen: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= FILE (PLACEHOLDER) =================
app.post("/send-file", auth, upload.single("file"), async (req, res) => {
  res.status(501).json({ error: "File upload not implemented yet" });
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
