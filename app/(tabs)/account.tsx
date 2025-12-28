import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase";

/* ================= CONFIG ================= */
const CURRENT_USER = "elijah"; // 🔑 Must match document ID in acc collection

/* ================= TYPES ================= */
type Message = {
  sender: string;
  type: "text" | "money";
  text?: string;
  amount?: number;
  timestamp: number;
};

/* ================= ROOT ================= */
export default function WhatsAppMoneyApp() {
  const [ready, setReady] = useState(false);

  // Ensure user exists
  useEffect(() => {
    const init = async () => {
      try {
        const ref = doc(db, "acc", CURRENT_USER);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            name: "Nabimanya elijah",
            balance: 0,
          });
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setReady(true);
      }
    };
    init();
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return <Inbox />;
}

/* ================= INBOX ================= */
function Inbox() {
  const [chats, setChats] = useState<string[]>([]);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [newUser, setNewUser] = useState("");

  useEffect(() => {
    const q = collection(db, "chats");
    return onSnapshot(q, (snap) => {
      const list: string[] = [];
      snap.forEach((d) => {
        if (d.id.includes(CURRENT_USER)) list.push(d.id);
      });
      setChats(list);
    });
  }, []);

  const startChat = async () => {
    if (!newUser || newUser === CURRENT_USER) return;

    const cleanUser = newUser.trim().toLowerCase();
    const userSnap = await getDoc(doc(db, "acc", cleanUser));
    if (!userSnap.exists()) {
      Alert.alert("User not found");
      return;
    }

    const chatId = [CURRENT_USER, cleanUser].sort().join("_");
    await setDoc(doc(db, "chats", chatId), { created: Date.now() }, { merge: true });
    setOpenChat(chatId);
    setNewUser("");
  };

  if (openChat) {
    return <Chat chatId={openChat} goBack={() => setOpenChat(null)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(i) => i}
        renderItem={({ item }) => {
          const other = item.replace(CURRENT_USER, "").replace("_", "");
          return (
            <TouchableOpacity style={styles.chatItem} onPress={() => setOpenChat(item)}>
              <Text style={styles.chatText}>{other}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <TextInput
        placeholder="Start chat with username"
        placeholderTextColor="#777"
        style={styles.input}
        value={newUser}
        onChangeText={setNewUser}
      />
      <TouchableOpacity style={styles.btn} onPress={startChat}>
        <Text style={styles.btnText}>Start Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= CHAT ================= */
function Chat({ chatId, goBack }: { chatId: string; goBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");

  const otherUser = chatId.replace(CURRENT_USER, "").replace("_", "");

  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((d) => list.push(d.data() as Message));
      setMessages(list);
    });
  }, [chatId]);

  const sendText = async () => {
    if (!text.trim()) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      sender: CURRENT_USER,
      type: "text",
      text,
      timestamp: Date.now(),
    });

    setText("");
  };

  const sendMoney = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    const senderRef = doc(db, "acc", CURRENT_USER);
    const receiverRef = doc(db, "acc", otherUser);

    try {
      await runTransaction(db, async (tx) => {
        const senderSnap = await tx.get(senderRef);
        const receiverSnap = await tx.get(receiverRef);

        if (!receiverSnap.exists()) throw "Receiver does not exist";

        const senderBal = senderSnap.data()?.balance || 0;
        if (senderBal < amt) throw "Insufficient balance";

        tx.update(senderRef, { balance: senderBal - amt });
        tx.update(receiverRef, {
          balance: (receiverSnap.data()?.balance || 0) + amt,
        });
      });

      await addDoc(collection(db, "chats", chatId, "messages"), {
        sender: CURRENT_USER,
        type: "money",
        amount: amt,
        timestamp: Date.now(),
      });

      setAmount("");
    } catch (e: any) {
      Alert.alert("Error", e.toString());
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.msgBubble,
              item.sender === CURRENT_USER ? styles.right : styles.left,
            ]}
          >
            {item.type === "text" ? (
              <Text style={styles.msgText}>{item.text}</Text>
            ) : (
              <Text style={styles.money}>
                💸 {item.sender === CURRENT_USER ? "Sent" : "Received"} UGX {item.amount}
              </Text>
            )}
          </View>
        )}
      />

      <TextInput
        placeholder="Message"
        placeholderTextColor="#777"
        style={styles.input}
        value={text}
        onChangeText={setText}
      />

      <TouchableOpacity style={styles.btn} onPress={sendText}>
        <Text style={styles.btnText}>Send</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Amount"
        placeholderTextColor="#777"
        keyboardType="numeric"
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.btnAlt} onPress={sendMoney}>
        <Text style={styles.btnText}>Send Money</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  container: { flex: 1, padding: 12, backgroundColor: "#000" },
  header: { color: "#fff", fontSize: 22, marginBottom: 10 },
  chatItem: { padding: 14, borderBottomWidth: 1, borderColor: "#222" },
  chatText: { color: "#fff" },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 6,
  },
  btnAlt: {
    backgroundColor: "#128C7E",
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  back: { color: "#25D366", marginBottom: 6 },
  msgBubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    maxWidth: "75%",
  },
  left: { backgroundColor: "#1e1e1e", alignSelf: "flex-start" },
  right: { backgroundColor: "#25D366", alignSelf: "flex-end" },
  msgText: { color: "#fff" },
  money: { color: "#fff", fontWeight: "700" },
});
