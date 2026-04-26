import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const API_URL = "https://your-api.com/messages";

  const fetchMessages = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sender: "me",
        }),
      });

      setText("");
      fetchMessages();
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, []);

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.msg,
        item.sender === "me" ? styles.me : styles.them,
      ]}
    >
      <Text style={styles.msgText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View>
          <Text style={styles.title}>API Chat</Text>
          <Text style={styles.subtitle}>Online • chatting now</Text>
        </View>
      </View>

      {/* CHAT */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, i) => i.toString()}
        contentContainerStyle={styles.chat}
      />

      {/* INPUT */}
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
    </KeyboardAvoidingView>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: "#075e54",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25d366",
    marginRight: 10,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  subtitle: {
    color: "#d1fae5",
    fontSize: 12,
  },

  chat: {
    padding: 12,
    paddingBottom: 80,
  },

  msg: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: "80%",
  },

  me: {
    backgroundColor: "#22c55e",
    alignSelf: "flex-end",
    borderBottomRightRadius: 5,
  },

  them: {
    backgroundColor: "#1f2c34",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 5,
  },

  msgText: {
    color: "#fff",
    fontSize: 15,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#0b141a",
  },

  input: {
    flex: 1,
    backgroundColor: "#1f2c34",
    padding: 12,
    borderRadius: 25,
    color: "#fff",
    paddingHorizontal: 15,
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

  sendText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
});
