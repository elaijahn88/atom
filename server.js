const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ================= FIREBASE INIT =================
let db;

try {
  if (!process.env.FIREBASE_KEY) {
    throw new Error("FIREBASE_KEY is missing");
  }

  console.log("🔐 Using FIREBASE_KEY from ENV");

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } catch (err) {
    throw new Error("FIREBASE_KEY is not valid JSON");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();

  console.log("🔥 Firebase initialized");
} catch (err) {
  console.error("❌ Firebase init failed:", err.message);
  process.exit(1);
}

// ================= HELPERS =================
const clean = (val) => (typeof val === "string" ? val.trim() : val);

// ================= DEFAULT USER =================
async function createDefaultUser() {
  const uid = "default_user_001";

  const ref = db.collection("users").doc(uid);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      uid,
      username: "Default User",
      balance: 1000,
      frozenBalance: 0,
      pushToken: null,
      deviceId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ Default user created");
  } else {
    console.log("ℹ️ Default user exists");
  }
}

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 API running...");
});

// ================= USER =================
app.post("/user", async (req, res) => {
  try {
    let { uid, username, pushToken, deviceId } = req.body;

    uid = clean(uid);

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
        balance: 100,
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
    let { fromUid, toUid, amount } = req.body;

    // ✅ Clean inputs
    fromUid = clean(fromUid);
    toUid = clean(toUid);
    amount = Number(amount);

    console.log("📥 REQUEST:", { fromUid, toUid, amount });

    // ✅ Validate
    if (!fromUid || !toUid) {
      return res.status(400).json({ error: "UIDs are required" });
    }

    if (fromUid === toUid) {
      return res.status(400).json({ error: "Cannot send to yourself" });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const senderRef = db.collection("users").doc(fromUid);
    const receiverRef = db.collection("users").doc(toUid);

    const [senderDoc, receiverDoc] = await Promise.all([
      senderRef.get(),
      receiverRef.get(),
    ]);

    if (!senderDoc.exists) {
      return res.status(404).json({ error: "Sender not found" });
    }

    // ✅ Auto-create receiver
    if (!receiverDoc.exists) {
      await receiverRef.set({
        uid: toUid,
        username: "New User",
        balance: 0,
        frozenBalance: 0,
        pushToken: null,
        deviceId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const sender = senderDoc.data();
    const receiver = (await receiverRef.get()).data();

    if ((sender.balance || 0) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 💸 Update balances
    await Promise.all([
      senderRef.update({
        balance: sender.balance - amount,
        updatedAt: Date.now(),
      }),
      receiverRef.update({
        balance: (receiver.balance || 0) + amount,
        updatedAt: Date.now(),
      }),
    ]);

    // 📜 Save transaction
    const txRef = db.collection("transactions").doc();

    await txRef.set({
      id: txRef.id,
      fromUid,
      toUid,
      amount,
      createdAt: Date.now(),
    });

    // 🔔 Push notification
    if (receiver.pushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: receiver.pushToken,
            title: "💰 Money Received",
            body: `You received UGX ${amount}`,
          }),
        });
      } catch (err) {
        console.log("⚠️ Push failed:", err.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================= TRANSACTIONS =================
app.get("/transactions/:uid", async (req, res) => {
  try {
    const uid = clean(req.params.uid);

    if (!uid) {
      return res.status(400).json({ error: "UID required" });
    }

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

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await createDefaultUser();
});
