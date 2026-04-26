import React, { useState, useEffect } from "react"; import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage"; import * as Notifications from "expo-notifications"; import * as Device from "expo-device";

const API_URL = "https://api-1-lbzf.onrender.com";

// ================= PUSH TOKEN ================= const getPushToken = async () => { if (!Device.isDevice) return null;

const { status } = await Notifications.requestPermissionsAsync(); if (status !== "granted") return null;

const token = (await Notifications.getExpoPushTokenAsync()).data; return token; };

// ================= API ================= const api = async (endpoint: string, method = "GET", body?: any) => { let token = await AsyncStorage.getItem("accessToken"); const refreshToken = await AsyncStorage.getItem("refreshToken");

let res = await fetch(API_URL + endpoint, { method, headers: { "Content-Type": "application/json", Authorization: token ? Bearer ${token} : "", }, body: body ? JSON.stringify(body) : undefined, });

if (res.status === 401 && refreshToken) { const r = await fetch(API_URL + "/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }), });

const d = await r.json();

if (d.accessToken) {
  await AsyncStorage.setItem("accessToken", d.accessToken);
  return api(endpoint, method, body);
}

}

const data = await res.json();

if (!res.ok) throw new Error(data.error); return data; };

// ================= UI ================= export default function App() { const [username, setUsername] = useState(""); const [pin, setPin] = useState(""); const [toUid, setToUid] = useState(""); const [amount, setAmount] = useState(""); const [balance, setBalance] = useState(0);

useEffect(() => { loadUser(); }, []);

const loadUser = async () => { try { const res = await api("/me"); setBalance(res.user.balance); } catch {} };

const register = async () => { try { await api("/register", "POST", { username, pin }); Alert.alert("Success", "Account created"); } catch (e: any) { Alert.alert("Error", e.message); } };

const login = async () => { try { const pushToken = await getPushToken();

const res = await api("/login", "POST", {
    username,
    pin,
    pushToken,
  });

  await AsyncStorage.setItem("accessToken", res.accessToken);
  await AsyncStorage.setItem("refreshToken", res.refreshToken);

  setBalance(res.user.balance);

  Alert.alert("Welcome", res.user.username);
} catch (e: any) {
  Alert.alert("Error", e.message);
}

};

const send = async () => { try { const res = await api("/send", "POST", { toUid, amount: Number(amount), });

Alert.alert("Receipt", res.receipt.reference);

  loadUser();
} catch (e: any) {
  Alert.alert("Error", e.message);
}

};

return ( <SafeAreaView style={styles.safe}> <ScrollView contentContainerStyle={styles.container}> <Text style={styles.title}>💸 Wallet App</Text>

<View style={styles.card}>
      <Text style={styles.section}>Account</Text>

      <TextInput
        placeholder="Username"
        placeholderTextColor="#94a3b8"
        onChangeText={setUsername}
        style={styles.input}
      />

      <TextInput
        placeholder="PIN"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        onChangeText={setPin}
        style={styles.input}
      />

      <View style={styles.row}>
        <TouchableOpacity onPress={register} style={styles.btnSecondary}>
          <Text style={styles.text}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={login} style={styles.btnPrimary}>
          <Text style={styles.text}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Current Balance</Text>
      <Text style={styles.balance}>UGX {balance}</Text>
    </View>

    <View style={styles.card}>
      <Text style={styles.section}>Send Money</Text>

      <TextInput
        placeholder="Receiver UID"
        placeholderTextColor="#94a3b8"
        onChangeText={setToUid}
        style={styles.input}
      />

      <TextInput
        placeholder="Amount"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        onChangeText={setAmount}
        style={styles.input}
      />

      <TouchableOpacity onPress={send} style={styles.btnPrimary}>
        <Text style={styles.text}>Send Money</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
</SafeAreaView>

); }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#020617", }, container: { padding: 20, }, title: { color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 20, }, card: { backgroundColor: "#0f172a", padding: 16, borderRadius: 16, marginBottom: 20, }, section: { color: "#cbd5f5", marginBottom: 10, fontSize: 16, }, input: { backgroundColor: "#1e293b", marginTop: 10, padding: 14, borderRadius: 10, color: "#fff", }, row: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, }, btnPrimary: { flex: 1, backgroundColor: "#3b82f6", padding: 14, borderRadius: 10, marginTop: 10, alignItems: "center", }, btnSecondary: { flex: 1, backgroundColor: "#475569", padding: 14, borderRadius: 10, marginTop: 10, marginRight: 10, alignItems: "center", }, text: { color: "#fff", fontWeight: "600", }, balanceCard: { backgroundColor: "#022c22", padding: 20, borderRadius: 16, marginBottom: 20, }, balanceLabel: { color: "#86efac", fontSize: 14, }, balance: { color: "#22c55e", fontSize: 24, fontWeight: "bold", marginTop: 5, }, });
