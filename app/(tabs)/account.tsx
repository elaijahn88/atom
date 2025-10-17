import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<"login" | "signup" | "account" | "profile">("login");

  // ✅ Signup and create Firestore user
  const handleSignup = async () => {
    setMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      setUser(newUser);

      await setDoc(doc(db, "acc", newUser.email), {
        Name: "Nabimanya Elijah",
        age: 26,
        bod: "12 2 1999",
        father: "Ziriganira Robert",
        idno: 18535416,
        mother: "Winnie Kenturegye Zebra",
        net: 200000,
        nin: "CM9900910LFEAF",
        nok: "Atukunda Timothy",
        phone: 746524088,
      });

      setView("account");
      setMessage("✅ Account created and profile stored!");
    } catch (error: any) {
      setMessage("⚠️ " + error.message);
    }
  };

  // ✅ Login and fetch Firestore profile
  const handleLogin = async () => {
    setMessage("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      setUser(currentUser);

      // Get Firestore profile
      const docRef = doc(db, "acc", currentUser.email);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        setProfile(snap.data());
        setMessage("✅ Profile loaded successfully!");
      } else {
        setMessage("⚠️ No profile found for this account.");
      }

      setView("account");
    } catch (error: any) {
      setMessage("⚠️ " + error.message);
    }
  };

  // ✅ Update profile field (edit + save)
  const handleProfileUpdate = async (field: string, value: any) => {
    if (!user) return;
    const docRef = doc(db, "acc", user.email);
    await updateDoc(docRef, { [field]: value });

    // Refresh profile after update
    const snap = await getDoc(docRef);
    setProfile(snap.data());
    setMessage(`✅ Updated ${field}!`);
  };

  // ✅ Logout
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setView("login");
    setMessage("👋 Logged out successfully.");
  };

  // ===================
  // 🔒 LOGIN / SIGNUP
  // ===================
  if (view === "login" || view === "signup") {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: "https://i.imgur.com/3G4sQO5.png" }}
          style={styles.logo}
        />
        <Text style={styles.title}>Firestore Profile Example</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={view === "login" ? handleLogin : handleSignup}
        >
          <Text style={styles.btnText}>
            {view === "login" ? "Login" : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setView(view === "login" ? "signup" : "login")}
        >
          <Text style={styles.linkText}>
            {view === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  // ===================
  // 👤 ACCOUNT SCREEN
  // ===================
  if (view === "account") {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: "https://i.imgur.com/3G4sQO5.png" }}
          style={styles.profilePic}
        />
        <Text style={styles.userName}>{user?.email}</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setView("profile")}
        >
          <Text style={styles.btnText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  // ===================
  // 🧍 PROFILE SCREEN
  // ===================
  if (view === "profile") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>User Profile</Text>

        {profile ? (
          Object.entries(profile).map(([key, value]) => (
            <View key={key} style={styles.infoCard}>
              <Text style={styles.infoLabel}>{key}:</Text>
              <TextInput
                style={styles.infoInput}
                value={String(value)}
                onChangeText={(text) => handleProfileUpdate(key, text)}
              />
            </View>
          ))
        ) : (
          <Text style={{ color: "#ccc" }}>Loading profile...</Text>
        )}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setView("account")}
        >
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: { width: 80, height: 80, marginBottom: 20, borderRadius: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    width: "100%",
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  primaryBtn: {
    backgroundColor: "#00BFFF",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryBtn: { marginTop: 10 },
  logoutBtn: {
    backgroundColor: "#FF9800",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  linkText: { color: "#00BFFF", marginTop: 10 },
  message: { color: "#ccc", marginTop: 20, textAlign: "center" },
  profilePic: { width: 90, height: 90, borderRadius: 45, marginBottom: 10 },
  userName: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 20 },
  infoCard: {
    backgroundColor: "#1a1a1a",
    width: "100%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
  },
  infoLabel: { color: "#aaa", fontSize: 14, marginBottom: 4 },
  infoInput: {
    color: "#fff",
    backgroundColor: "#151515",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
