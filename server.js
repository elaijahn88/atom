// ================= DEPLOYABLE FULL SERVER =================
// Chat + Wallet + Realtime + Calls + File ready

const express = require("express");
const http = require("http");
const admin = require("firebase-admin");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const { Server } = require("socket.io");

// ================= APP =================
const app = express();
app.use(express.json());
app.use(cors());

// ================= SERVER =================
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 60000,
});

// ================= CONFIG =================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// ================= FIREBASE =================
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ================= HELPERS =================
const clean = (v) =>
  typeof v === "string" ? v.trim().toLowerCase() : v;

const generateUID = () =>
  "user-" + Math.random().toString(36).slice(2, 10);

const getChatId = (a, b) => [a, b].sort().join("_");

// ================= SOCKET STATE =================
const onlineUsers = {};

// ================= AUTH MIDDLEWARE =================
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ================= SOCKET.IO =================
io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id);

  // JOIN USER
  socket.on("join", async (uid) => {
    onlineUsers[uid] = socket.id;
    socket.uid = uid;

    await db.collection("presence").doc(uid).set({
      online: true,
      lastSeen: Date.now(),
    });

    socket.broadcast.emit("userOnline", uid);
  });

  // CHAT REALTIME
  socket.on("sendMessage", ({ toUid, message }) => {
    const target = onlineUsers[toUid];
    if (target) io.to(target).emit("newMessage", message);
  });

  // CALL SIGNALING
  socket.on("offer", ({ toUid, offer }) => {
    const target = onlineUsers[toUid];
    if (target) io.to(target).emit("offer", { offer, from: socket.uid });
  });

  socket.on("answer", ({ toUid, answer }) => {
    const target = onlineUsers[toUid];
    if (target) io.to(target).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ toUid, candidate }) => {
    const target = onlineUsers[toUid];
    if (target) io.to(target).emit("ice-candidate", { candidate });
  });

  // DISCONNECT
  socket.on("disconnect", async () => {
    if (socket.uid) {
      delete onlineUsers[socket.uid];

      await db.collection("presence").doc(socket.uid).set({
        online: false,
        lastSeen: Date.now(),
      });

      socket.broadcast.emit("userOffline", socket.uid);
    }
  });
});

// ================= AUTH =================
app.post("/auth/login", async (req, res) => {
  try {
    let { username, pin } = req.body;
    username = clean(username);

    const snap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    let user;

    if (snap.empty) {
      const uid = generateUID();
      const hash = await bcrypt.hash(pin, 10);

      user = {
        uid,
        username,
        pin: hash,
        balance: 100,
        createdAt: Date.now(),
      };

      await db.collection("users").doc(uid).set(user);
    } else {
      user = snap.docs[0].data();
      const ok = await bcrypt.compare(pin, user.pin);

      if (!ok) return res.status(401).json({ error: "Wrong PIN" });
    }

    const payload = { uid: user.uid, username: user.username };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      accessToken,
      refreshToken,
      user: payload,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= CHAT =================
app.post("/chat/send", auth, async (req, res) => {
  try {
    const { toUid, text } = req.body;
    const fromUid = req.user.uid;

    const chatId = getChatId(fromUid, toUid);

    const msg = {
      id: Date.now().toString(),
      from: fromUid,
      to: toUid,
      text,
      createdAt: Date.now(),
    };

    await db
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .add(msg);

    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= WALLET =================
app.post("/wallet/send", auth, async (req, res) => {
  try {
    const { toUid, amount } = req.body;
    const fromUid = req.user.uid;

    const senderRef = db.collection("users").doc(fromUid);
    const receiverRef = db.collection("users").doc(toUid);

    await db.runTransaction(async (t) => {
      const s = await t.get(senderRef);
      const r = await t.get(receiverRef);

      if (s.data().balance < amount)
        throw new Error("Insufficient balance");

      t.update(senderRef, {
        balance: s.data().balance - amount,
      });

      t.update(receiverRef, {
        balance: (r.data()?.balance || 0) + amount,
      });
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= PRESENCE =================
app.get("/presence/:uid", auth, async (req, res) => {
  const doc = await db
    .collection("presence")
    .doc(req.params.uid)
    .get();

  res.json(doc.data() || { online: false });
});

// ================= START SERVER =================
server.listen(PORT, () => {
  console.log("🚀 DEPLOYED SERVER RUNNING ON PORT", PORT);
});
