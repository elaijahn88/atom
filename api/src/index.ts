import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import bcrypt from "bcryptjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ------------------------
// Firebase Admin Setup
// ------------------------
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = admin.firestore();

// ------------------------
// Root Route
// ------------------------
app.get("/", (req, res) => res.send("API is running 🚀"));

// ------------------------
// ===== USERS =====
// ------------------------

// Get all users
app.get("/users", async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const users: any[] = [];
    snap.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get single user
app.get("/users/:id", async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Update phone or password
app.put("/users/:id", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const updateData: any = {};
    if (phone) updateData.phone = phone;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (!Object.keys(updateData).length)
      return res.status(400).json({ error: "No valid fields provided" });

    await db.collection("users").doc(req.params.id).update(updateData);
    res.json({ message: "User updated", updatedFields: updateData });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Safely update balance
app.put("/users/:id/balance", async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== "number") return res.status(400).json({ error: "Amount must be a number" });

    const userRef = db.collection("users").doc(req.params.id);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      if (!doc.exists) throw new Error("User not found");

      const currentBalance = doc.data()?.balance || 0;
      const newBalance = currentBalance + amount;
      if (newBalance < 0) throw new Error("Insufficient balance");

      transaction.update(userRef, { balance: newBalance });
    });

    res.json({ message: "Balance updated successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------
// ===== TRANSACTIONS =====
// ------------------------
app.post("/transactions", async (req, res) => {
  try {
    const { userId, type, amount, description } = req.body;
    if (!userId || !type || typeof amount !== "number")
      return res.status(400).json({ error: "Missing required fields" });

    const transactionRef = await db.collection("transactions").add({
      userId,
      type,
      amount,
      description: description || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Transaction recorded", id: transactionRef.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/users/:id/transactions", async (req, res) => {
  try {
    const snap = await db
      .collection("transactions")
      .where("userId", "==", req.params.id)
      .orderBy("createdAt", "desc")
      .get();

    const transactions: any[] = [];
    snap.forEach((doc) => transactions.push({ id: doc.id, ...doc.data() }));

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------
// ===== FOOD ORDERS =====
// ------------------------
app.post("/orders", async (req, res) => {
  try {
    const { userId, items, totalPrice, status } = req.body;
    if (!userId || !items || !Array.isArray(items) || !totalPrice)
      return res.status(400).json({ error: "Missing required fields" });

    const orderRef = await db.collection("orders").add({
      userId,
      items,
      totalPrice,
      status: status || "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Order created", id: orderRef.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/users/:id/orders", async (req, res) => {
  try {
    const snap = await db.collection("orders").where("userId", "==", req.params.id).get();
    const orders: any[] = [];
    snap.forEach((doc) => orders.push({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required" });

    await db.collection("orders").doc(req.params.id).update({ status });
    res.json({ message: "Order status updated" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------
// ===== MARKETPLACE =====
// ------------------------
app.post("/products", async (req, res) => {
  try {
    const { sellerId, name, description, price, stock } = req.body;
    if (!sellerId || !name || !price || !stock)
      return res.status(400).json({ error: "Missing required fields" });

    const productRef = await db.collection("products").add({
      sellerId,
      name,
      description: description || "",
      price,
      stock,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Product added", id: productRef.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const snap = await db.collection("products").get();
    const products: any[] = [];
    snap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    const { stock, price } = req.body;
    const updateData: any = {};
    if (stock !== undefined) updateData.stock = stock;
    if (price !== undefined) updateData.price = price;

    if (!Object.keys(updateData).length) return res.status(400).json({ error: "No fields to update" });

    await db.collection("products").doc(req.params.id).update(updateData);
    res.json({ message: "Product updated", updatedFields: updateData });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
