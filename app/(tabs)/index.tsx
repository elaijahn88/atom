import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";

export default function App() {
  const [tab, setTab] = useState("chat");

  // CHAT
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // MONEY
  const [amount, setAmount] = useState("");

  // LAB
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [voltage, setVoltage] = useState("");
  const [resistance, setResistance] = useState("");
  const [current, setCurrent] = useState(null);

  const products = [
    { id: "1", name: "iPhone 13 Pro", price: "UGX 2,800,000", place: "Kampala" },
    { id: "2", name: "Gaming Laptop", price: "UGX 3,500,000", place: "Entebbe" },
    { id: "3", name: "Nike Sneakers", price: "UGX 250,000", place: "Nairobi" },
  ];

  const API_URL = "https://your-api.com/messages";

  /* ---------- CHAT ---------- */
  const fetchMessages = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setMessages(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!text) return;

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sender: "me" }),
    });

    setText("");
    fetchMessages();
  };

  /* ---------- LAB FUNCTION ---------- */
  const calculateCurrent = () => {
    if (voltage && resistance) {
      const result = parseFloat(voltage) / parseFloat(resistance);
      setCurrent(result.toFixed(2));
    }
  };

  /* ---------- RENDER CHAT ---------- */
  const renderMsg = ({ item }) => (
    <View
      style={[
        styles.msg,
        item.sender === "me" ? styles.me : styles.them,
      ]}
    >
      <Text style={styles.msgText}>{item.text}</Text>
    </View>
  );

  /* ---------- SHOP ---------- */
  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.imageBox} />
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price}</Text>
      <Text style={styles.productPlace}>📍 {item.place}</Text>

      <TouchableOpacity style={styles.buyBtn}>
        <Text style={styles.buyText}>Buy Now</Text>
      </TouchableOpacity>
    </View>
  );

  /* ---------- LAB LIST ---------- */
  const experiments = [
    { id: "1", name: "Ohm’s Law" },
    { id: "2", name: "Projectile Motion" },
    { id: "3", name: "Pendulum" },
    { id: "4", name: "Wave Simulator" },
  ];

  const renderExperiment = ({ item }) => (
    <TouchableOpacity
      style={styles.labCard}
      onPress={() => setSelectedExperiment(item.name)}
    >
      <Text style={styles.labTitle}>🧪 {item.name}</Text>
      <Text style={styles.labDesc}>Tap to run experiment</Text>
    </TouchableOpacity>
  );

  /* ---------- SCREEN SWITCH ---------- */
  const renderScreen = () => {
    // CHAT
    if (tab === "chat") {
      return (
        <>
          <FlatList
            data={messages}
            renderItem={renderMsg}
            keyExtractor={(i, idx) => idx.toString()}
            contentContainerStyle={styles.chat}
          />

          <View style={styles.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message..."
              placeholderTextColor="#888"
              style={styles.input}
            />

            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // MONEY
    if (tab === "money") {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>💸 Money Transfer</Text>

          <TextInput
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            style={styles.moneyInput}
          />

          <TouchableOpacity style={styles.greenBtn}>
            <Text style={styles.btnText}>Send Money</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.blueBtn}>
            <Text style={styles.btnText}>Request Money</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // SHOP
    if (tab === "shop") {
      return (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.shop}
        />
      );
    }

    // PHYSICS LAB
    if (tab === "others") {
      // 🔬 Ohm’s Law Screen
      if (selectedExperiment === "Ohm’s Law") {
        return (
          <View style={styles.center}>
            <Text style={styles.title}>⚡ Ohm's Law Lab</Text>

            <TextInput
              placeholder="Voltage (V)"
              value={voltage}
              onChangeText={setVoltage}
              style={styles.moneyInput}
            />

            <TextInput
              placeholder="Resistance (Ω)"
              value={resistance}
              onChangeText={setResistance}
              style={styles.moneyInput}
            />

            <TouchableOpacity
              style={styles.greenBtn}
              onPress={calculateCurrent}
            >
              <Text style={styles.btnText}>Calculate</Text>
            </TouchableOpacity>

            {current && (
              <Text style={{ color: "#25d366", marginTop: 10 }}>
                Current = {current} A
              </Text>
            )}

            <TouchableOpacity
              style={styles.blueBtn}
              onPress={() => setSelectedExperiment(null)}
            >
              <Text style={styles.btnText}>Back</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // 🔬 LAB LIST
      return (
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🔬 Physics Lab</Text>

          <FlatList
            data={experiments}
            renderItem={renderExperiment}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 12 }}
          />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Super App</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab("chat")}>
          <Text style={[styles.tab, tab === "chat" && styles.active]}>
            Chats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab("money")}>
          <Text style={[styles.tab, tab === "money" && styles.active]}>
            Money
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab("shop")}>
          <Text style={[styles.tab, tab === "shop" && styles.active]}>
            Shop 🛒
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab("others")}>
          <Text style={[styles.tab, tab === "others" && styles.active]}>
            Lab 🔬
          </Text>
        </TouchableOpacity>
      </View>

      {/* SCREEN */}
      {renderScreen()}
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b141a" },

  header: {
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#075e54",
    alignItems: "center",
  },

  headerText: { color: "#fff", fontWeight: "700", fontSize: 18 },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#111b21",
    paddingVertical: 10,
  },

  tab: { color: "#888", fontWeight: "600" },
  active: { color: "#25d366" },

  chat: { padding: 12, paddingBottom: 80 },

  msg: {
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: "75%",
  },

  me: { backgroundColor: "#22c55e", alignSelf: "flex-end" },
  them: { backgroundColor: "#1f2c34", alignSelf: "flex-start" },

  msgText: { color: "#fff" },

  inputBar: {
    flexDirection: "row",
    padding: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "#1f2c34",
    borderRadius: 20,
    padding: 12,
    color: "#fff",
  },

  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#25d366",
    width: 45,
    height: 45,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  sendText: { fontSize: 18, fontWeight: "bold" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: { color: "#fff", fontSize: 18, marginBottom: 15 },

  moneyInput: {
    width: "80%",
    backgroundColor: "#1f2c34",
    padding: 12,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 10,
  },

  greenBtn: {
    backgroundColor: "#22c55e",
    padding: 12,
    width: "80%",
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },

  blueBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    width: "80%",
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: { color: "#000", fontWeight: "700" },

  shop: { padding: 12 },

  productCard: {
    backgroundColor: "#1f2c34",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  imageBox: {
    height: 120,
    backgroundColor: "#111b21",
    borderRadius: 10,
    marginBottom: 10,
  },

  productName: { color: "#fff", fontWeight: "700" },
  productPrice: { color: "#25d366", marginTop: 5 },
  productPlace: { color: "#aaa", marginTop: 3 },

  buyBtn: {
    marginTop: 10,
    backgroundColor: "#25d366",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  buyText: { color: "#000", fontWeight: "700" },

  // LAB
  labCard: {
    backgroundColor: "#1f2c34",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },

  labTitle: {
    color: "#25d366",
    fontWeight: "700",
    fontSize: 16,
  },

  labDesc: {
    color: "#aaa",
    marginTop: 5,
  },
});
