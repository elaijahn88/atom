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
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing in environment variables");
}

// ================= FIREBASE =================
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
    console.error("Push notification failed:", err.message);
  }
};

// ================= AUTH =================
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ================= REGISTER (kept for completeness) =================
app.post("/register", async (req, res) => {
  try {
    let { username, pin } = req.body;
    username = clean(username);

    if (!username || !pin || pin.length < 4) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const uid = generateUID();
    const hashedPin = await bcrypt.hash(pin, 10);

    await db.ref("users/" + uid).set({
      uid,
      username,
      usernameKey: username.toLowerCase(),
      pin: hashedPin,
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
    username = clean(username).toLowerCase();

    const snap = await db
      .ref("users")
      .orderByChild("usernameKey")
      .equalTo(username)
      .once("value");

    if (!snap.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = snap.val();
    const user = Object.values(userData)[0];

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) {
      return res.status(401).json({ error: "Wrong PIN" });
    }

    if (pushToken) {
      await db.ref("users/" + user.uid).update({ pushToken });
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
      lastMessage: type === "text" ? text.trim().substring(0, 100) : "📎 File",
      lastSender: fromUid,
      updatedAt: Date.now(),
    };

    await db.ref(`chats/${chatId}/meta`).update(meta);

    await db.ref(`userChats/\( {fromUid}/ \){chatId}`).update({
      chatId,
      with: toUid,
      ...meta,
    });

    await db.ref(`userChats/\( {toUid}/ \){chatId}`).update({
      chatId,
      with: fromUid,
      ...meta,
    });

    // Send push notification
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Other endpoints (unchanged but with minor robustness) =================
app.post("/send-file", auth, upload.single("file"), async (req, res) => {
  // ... (keep as is, or implement if needed)
  res.status(501).json({ error: "File upload not fully implemented in this fix" });
});

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

    if (Object.keys(updates).length > 0) {
      await db.ref(`chats/${chatId}/messages`).update(updates);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/typing", auth, async (req, res) => {
  try {
    const { toUid, typing } = req.body;
    const fromUid = req.user.uid;
    const chatId = getChatId(fromUid, toUid);

    await db.ref(`typing/\( {chatId}/ \){fromUid}`).set({
      typing: !!typing,
      updatedAt: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Chat server running on port ${PORT}`));
