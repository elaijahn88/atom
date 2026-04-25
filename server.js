// ================= IMPORTS =================
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

// ================= APP =================
const app = express();
app.use(express.json());
app.use(cors());

// ================= CONFIG =================
const JWT_SECRET = process.env.JWT_SECRET;

// ================= FIREBASE =================
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const firestore = admin.firestore(); // users
const rtdb = admin.database(); // chats

// ================= HELPERS =================
const getChatId = (a, b) => [a, b].sort().join("_");

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

// ================= SEND MESSAGE =================
app.post("/send-message", auth, async (req, res) => {
  try {
    const { toUid, text } = req.body;
    const fromUid = req.user.uid;

    const chatId = getChatId(fromUid, toUid);

    const msgRef = rtdb.ref(`chats/${chatId}/messages`).push();

    const message = {
      id: msgRef.key,
      from: fromUid,
      to: toUid,
      text,
      createdAt: Date.now(),
    };

    await msgRef.set(message);

    // 🔔 Push
    const receiver = (
      await firestore.collection("users").doc(toUid).get()
    ).data();

    await sendPush(
      receiver?.pushToken,
      "💬 New Message",
      text.slice(0, 100)
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

    const snap = await rtdb.ref("userChats/" + uid).once("value");

    const chats = [];
    snap.forEach((c) => chats.push(c.val()));

    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PRESENCE =================
app.post("/presence", auth, async (req, res) => {
  try {
    const uid = req.user.uid;

    await rtdb.ref("presence/" + uid).set({
      online: true,
      lastSeen: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log("💬 Chat server running"));
