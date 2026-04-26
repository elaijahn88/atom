import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

export default function App() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [toUid, setToUid] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Wallet</Text>
        <Text style={styles.balance}>UGX {balance}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Auth Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>

          <TextInput
            placeholder="Username"
            placeholderTextColor="#aaa"
            onChangeText={setUsername}
            style={styles.input}
          />

          <TextInput
            placeholder="PIN"
            placeholderTextColor="#aaa"
            secureTextEntry
            onChangeText={setPin}
            style={styles.input}
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Send Money Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send Money</Text>

          <TextInput
            placeholder="Receiver UID"
            placeholderTextColor="#aaa"
            onChangeText={setToUid}
            style={styles.input}
          />

          <TextInput
            placeholder="Amount"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            onChangeText={setAmount}
            style={styles.input}
          />

          <TouchableOpacity style={styles.sendBtn}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111b21",
  },

  header: {
    backgroundColor: "#075e54",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  balance: {
    color: "#d1fae5",
    marginTop: 5,
    fontSize: 16,
  },

  content: {
    padding: 15,
  },

  card: {
    backgroundColor: "#202c33",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  cardTitle: {
    color: "#e9edef",
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#2a3942",
    padding: 12,
    borderRadius: 10,
    color: "#fff",
    marginTop: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },

  primaryBtn: {
    backgroundColor: "#25d366",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginLeft: 5,
  },

  primaryText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "bold",
  },
});
