// app/screens/AuthScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { loginOrSignup, logout } from "../lib/login";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    const result = await loginOrSignup(email, password, phone);
    setLoading(false);

    if (result.success) {
      setLoggedIn(true);
      Alert.alert("Success", "Logged in successfully!");
    } else {
      Alert.alert("Error", result.error || "Something went wrong");
    }
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setPhone("");
    Alert.alert("Success", "Logged out successfully");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>

      {!loggedIn ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login / Signup</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.loggedInText}>You are logged in!</Text>
          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E2F",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#2A2A3D",
    color: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6C63FF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: "#FF6363",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loggedInText: {
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
  },
});
