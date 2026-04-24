const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ================= FIREBASE INIT (HYBRID) =================
let db;

try {
  let serviceAccount;

  if (process.env.FIREBASE_KEY) {
    // ✅ PRODUCTION (Render)
    console.log("🔐 Using FIREBASE_KEY from ENV");
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } else {
    // ✅ LOCAL (serviceAccountKey.json)
    console.log("📁 Using local serviceAccountKey.json");
    serviceAccount = require("./serviceAccountKey.json");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();

  console.log("🔥 Firebase initialized successfully");
} catch (err) {
  console.error("❌ Firebase init failed:", err.message);
  process.exit(1); // STOP server if Firebase fails
}

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 API running...");
});

// ================= USER =================
app.post("/user", async (req, res) => {
  try {
    const { uid, username, pushToken, deviceId } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "UID required" });
    }

    const ref = db.collection("users").doc(uid);
    const doc = await ref.get();

    const data = {
      uid,
      username: username || "User",
      pushToken: pushToken || null,
      deviceId: deviceId || null,
      updatedAt: Date.now(),
    };

    if (!doc.exists) {
      await ref.set({
        ...data,
        balance: 0,
        frozenBalance: 0,
        createdAt: Date.now(),
      });
    } else {
      await ref.update(data);
    }

    const finalDoc = await ref.get();

    res.json({ success: true, user: finalDoc.data() });
  } catch (err) {
    console.error("❌ /user error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= SEND MONEY =================
app.post("/send", async (req, res) => {
  try {
    const { fromUid, toUid, amount } = req.body;

    if (!fromUid || !toUid || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const senderRef = db.collection("users").doc(fromUid);
    const receiverRef = db.collection("users").doc(toUid);

    const senderDoc = await senderRef.get();
    const receiverDoc = await receiverRef.get();

    if (!senderDoc.exists || !receiverDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const sender = senderDoc.data();
    const receiver = receiverDoc.data();

    if ((sender.balance || 0) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 💸 Update balances
    await senderRef.update({
      balance: (sender.balance || 0) - amount,
    });

    await receiverRef.update({
      balance: (receiver.balance || 0) + amount,
    });

    // 📜 SAVE TRANSACTION
    const txRef = db.collection("transactions").doc();
    await txRef.set({
      id: txRef.id,
      fromUid,
      toUid,
      amount,
      createdAt: Date.now(),
    });

    // 🔔 PUSH NOTIFICATION
    if (receiver.pushToken) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: receiver.pushToken,
          title: "💰 Money Received",
          body: `You received UGX ${amount}`,
        }),
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= TRANSACTIONS =================
app.get("/transactions/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const sent = await db
      .collection("transactions")
      .where("fromUid", "==", uid)
      .get();

    const received = await db
      .collection("transactions")
      .where("toUid", "==", uid)
      .get();

    const txs = [];

    sent.forEach((doc) => txs.push(doc.data()));
    received.forEach((doc) => txs.push(doc.data()));

    txs.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ success: true, transactions: txs });
  } catch (err) {
    console.error("❌ /transactions error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
