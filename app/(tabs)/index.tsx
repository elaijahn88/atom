// app/coco/index.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { loginOrSignup, logout } from "../lib/fire"; // <-- import from lib

const Index = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async () => {
    const result = await loginOrSignup(email, password, phone);
    if (result.success) setLoggedIn(true);
    else Alert.alert("Error", result.error || "Something went wrong");
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
    setEmail("");
    setPhone("");
    setPassword("");
  };

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login / Sign Up</Text>

        <TextInput placeholder="Phone" style={styles.input} value={phone} onChangeText={setPhone} />
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.info}>Email: {email}</Text>
      <Text style={styles.info}>Phone: {phone}</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#1F1F2E" },
  title: { fontSize: 28, fontWeight: "bold", color: "#FF6B6B", marginBottom: 20, textAlign: "center" },
  input: { backgroundColor: "#2C2C3C", color: "#fff", padding: 15, borderRadius: 12, marginBottom: 15 },
  button: { backgroundColor: "#FF6B6B", padding: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  info: { color: "#fff", fontSize: 18, textAlign: "center", marginVertical: 5 },
});
