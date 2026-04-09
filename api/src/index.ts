import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import OpenAI from "openai";

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
// OpenAI Setup
// ------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------------
// Routes
// ------------------------
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Example Firestore route
app.get("/users", async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const users: any[] = [];
    usersSnap.forEach((doc) => users.push(doc.data()));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Example OpenAI route
app.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    res.json(response.choices[0].message);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
