import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const API_URL = "https://api-1-lbzf.onrender.com";

// ================= PUSH TOKEN =================
const getPushToken = async () => {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
};

// ================= API =================
const api = async (endpoint: string, method = "GET", body?: any) => {
  let token = await AsyncStorage.getItem("accessToken");
  const refreshToken = await AsyncStorage.getItem("refreshToken");

  let res = await fetch(API_URL + endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 🔁 auto refresh
  if (res.status === 401 && refreshToken) {
    const r = await fetch(API_URL + "/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const d = await r.json();

    if (d.accessToken) {
      await AsyncStorage.setItem("accessToken", d.accessToken);
      return api(endpoint, method, body);
    }
  }

  const data = await res.json();

  if (!res.ok) throw new Error(data.error);
  return data;
};

// ================= UI =================
export default function App() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [toUid, setToUid] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api("/me");
      setBalance(res.user.balance);
    } catch {}
  };

  const register = async () => {
    try {
      await api("/register", "POST", { username, pin });
      Alert.alert("Success", "Account created");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const login = async () => {
    try {
      const pushToken = await getPushToken();

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

  const send = async () => {
    try {
      const res = await api("/send", "POST", {
        toUid,
        amount: Number(amount),
      });

      Alert.alert("Receipt", res.receipt.reference);

      loadUser();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Username" onChangeText={setUsername} style={styles.input}/>
      <TextInput placeholder="PIN" secureTextEntry onChangeText={setPin} style={styles.input}/>

      <TouchableOpacity onPress={register} style={styles.btn}>
        <Text style={styles.text}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={login} style={styles.btn}>
        <Text style={styles.text}>Login</Text>
      </TouchableOpacity>

      <Text style={styles.balance}>Balance: UGX {balance}</Text>

      <TextInput placeholder="Receiver UID" onChangeText={setToUid} style={styles.input}/>
      <TextInput placeholder="Amount" onChangeText={setAmount} style={styles.input}/>

      <TouchableOpacity onPress={send} style={styles.btn}>
        <Text style={styles.text}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0f172a" },
  input: {
    backgroundColor: "#1e293b",
    marginTop: 10,
    padding: 12,
    color: "#fff",
  },
  btn: {
    backgroundColor: "#3b82f6",
    padding: 14,
    marginTop: 15,
  },
  text: { color: "#fff", textAlign: "center" },
  balance: { color: "#22c55e", marginTop: 20 },
});
