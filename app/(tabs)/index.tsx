import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";

const API = "https://sms-fn0s.onrender.com";

// 🔐 TEMP TOKEN (replace after login)
const TOKEN = "YOUR_JWT_TOKEN";

export default function App() {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");

  // ================= FETCH MESSAGES =================
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API}/chat/messages`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      });

      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // ================= SEND MESSAGE =================
  const sendMessage = async () => {
    if (!text) return;

    try {
      await fetch(`${API}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          toUid: "demo-user",
          text,
        }),
      });

      setText("");
      fetchMessages();
    } catch (e) {
      console.log(e);
    }
  };

  // ================= SEND MONEY =================
  const sendMoney = async () => {
    if (!amount) return;

    try {
      await fetch(`${API}/wallet/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          toUid: "demo-user",
          amount: Number(amount),
        }),
      });

      setAmount("");
      alert("Money sent");
    } catch (e) {
      console.log(e);
    }
  };

  // ================= CHAT RENDER =================
  const renderMsg = ({ item }) => (
    <View style={styles.msg}>
      <Text style={styles.msgText}>{item.text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Chat App</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab("chat")}>
          <Text style={styles.tab}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab("money")}>
          <Text style={styles.tab}>Money</Text>
        </TouchableOpacity>
      </View>

      {/* CHAT */}
      {tab === "chat" && (
        <>
          <FlatList
            data={messages}
            renderItem={renderMsg}
            keyExtractor={(i, idx) => idx.toString()}
          />

          <View style={styles.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              style={styles.input}
            />

            <TouchableOpacity onPress={sendMessage}>
              <Text style={styles.send}>➤</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* MONEY */}
      {tab === "money" && (
        <View style={styles.center}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            style={styles.input}
          />

          <TouchableOpacity onPress={sendMoney} style={styles.btn}>
            <Text>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b141a" },

  header: {
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#075e54",
    alignItems: "center",
  },

  headerText: { color: "#fff", fontSize: 18 },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },

  tab: { color: "#25d366" },

  msg: {
    backgroundColor: "#1f2c34",
    margin: 5,
    padding: 10,
    borderRadius: 10,
  },

  msgText: { color: "#fff" },

  inputBar: {
    flexDirection: "row",
    padding: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "#1f2c34",
    padding: 10,
    borderRadius: 10,
    color: "#fff",
  },

  send: { color: "#25d366", fontSize: 20, marginLeft: 10 },

  center: { flex: 1, justifyContent: "center", padding: 20 },

  btn: {
    backgroundColor: "#25d366",
    padding: 10,
    marginTop: 10,
    alignItems: "center",
    borderRadius: 10,
  },
});
