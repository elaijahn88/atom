import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ScrollView, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { useAuthAndVideo } from "../logic/ads";

const { width, height } = Dimensions.get("window");

export default function AuthAndVideoUI() {
  const {
    email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
    name, setName, account, setAccount, age, setAge,
    loading, message, isLoginMode, setIsLoginMode,
    showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
    isLoggedIn, user, currentIndex, videos, showVideoFeed,
    videoRefs, onViewableItemsChanged, viewConfigRef,
    handleSignUp, handleSignIn, handleLogout
  } = useAuthAndVideo();

  // 🔹 Logged-in Screens
  if (isLoggedIn && user) {
    if (!showVideoFeed) return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        <Video
          source={{ uri: "https://xlijah.com/soso.mp4" }}
          style={styles.fullscreenVideo}
          resizeMode="cover"
          repeat
          paused={false}
        />
      </View>
    );

    return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        {videos.length === 0 ? (
          <View style={[styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color="#00BFFF" />
            <Text style={{ color: "#ccc", marginTop: 10 }}>Loading video...</Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <View style={{ width, height, backgroundColor: "black" }}>
                <Video
                  ref={ref => (videoRefs.current[index] = ref)}
                  source={{ uri: item.uri }}
                  style={styles.video}
                  resizeMode="cover"
                  repeat
                  paused={currentIndex !== index}
                />
              </View>
            )}
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="center"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewConfigRef.current}
            windowSize={3}
            removeClippedSubviews
          />
        )}
      </View>
    );
  }

  // 🔐 Login/Signup Screen
  return (
    <KeyboardAvoidingView style={styles.darkContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="lock-closed-outline" size={52} color="#00BFFF" />
          <Text style={styles.darkTitle}>{isLoginMode ? "Welcome Back" : "Join the Community"}</Text>
          <Text style={styles.darkSubtitle}>{isLoginMode ? "Sign in to continue" : "Create your account below"}</Text>
        </View>

        <View style={styles.darkForm}>
          <DarkField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <DarkPasswordField label="Password" value={password} onChangeText={setPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} />
          {!isLoginMode && (
            <DarkPasswordField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />
          )}
          {!isLoginMode && (
            <>
              <DarkField label="Full Name" value={name} onChangeText={setName} />
              <DarkField label="Account" value={account} onChangeText={setAccount} keyboardType="numeric" />
              <DarkField label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
            </>
          )}

          <TouchableOpacity style={[styles.darkButton, loading && { opacity: 0.6 }]} onPress={isLoginMode ? handleSignIn : handleSignUp} disabled={loading}>
            <Text style={styles.darkButtonText}>{isLoginMode ? "Sign In" : "Sign Up"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text style={styles.switchText}>{isLoginMode ? "Don’t have an account? Sign Up" : "Already have one? Sign In"}</Text>
          </TouchableOpacity>

          {message ? <Text style={[styles.msg, message.includes("✅") ? { color: "#4CAF50" } : { color: "#FF5252" }]}>{message}</Text> : null}
        </View>

        {loading && <ActivityIndicator size="large" color="#00BFFF" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* 🔹 Reusable Input Fields */
const DarkField = ({ label, value, onChangeText, keyboardType = "default", placeholder }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.darkLabel}>{label}</Text>
    <TextInput style={styles.darkInput} placeholder={placeholder} placeholderTextColor="#666" value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
  </View>
);

const DarkPasswordField = ({ label, value, onChangeText, show, toggle }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.darkLabel}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TextInput style={[styles.darkInput, { flex: 1 }]} placeholder="••••••" placeholderTextColor="#666" value={value} onChangeText={onChangeText} secureTextEntry={!show} />
      <TouchableOpacity onPress={toggle} style={{ padding: 4 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
      </TouchableOpacity>
    </View>
  </View>
);

/* 🎨 Styles */
const styles = StyleSheet.create({
  darkContainer: { flex: 1, backgroundColor: "#0a0a0a" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 30 },
  darkTitle: { fontSize: 26, fontWeight: "700", color: "#fff", marginTop: 10 },
  darkSubtitle: { color: "#999", fontSize: 15, marginTop: 4 },
  darkForm: { backgroundColor: "#1a1a1a", padding: 24, borderRadius: 20 },
  darkLabel: { color: "#ccc", fontSize: 14, marginBottom: 4 },
  darkInput: { backgroundColor: "#111", color: "#fff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16 },
  darkButton: { backgroundColor: "#00BFFF", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  darkButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switchText: { color: "#00BFFF", textAlign: "center", marginTop: 16 },
  msg: { textAlign: "center", marginTop: 12, fontSize: 14 },
  fullscreenVideo
