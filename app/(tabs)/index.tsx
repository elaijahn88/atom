
import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, FlatList, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { useAuthLogic } from "./useAuthLogic";

const { width, height } = Dimensions.get("window");

export default function AuthScreen() {
  const { state, setters, handlers } = useAuthLogic();

  if (state.isLoggedIn && state.user) {
    if (!state.showVideoFeed) {
      return (
        <View style={styles.darkContainer}>
          <StatusBar hidden />
          <Video source={{ uri: "https://xlijah.com/soso.mp4" }} style={styles.fullscreenVideo} resizeMode="cover" repeat paused={false} muted={false} />
        </View>
      );
    }

    return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        {state.videos.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#00BFFF" />
            <Text style={{ color: "#ccc", marginTop: 10 }}>Loading video...</Text>
          </View>
        ) : (
          <FlatList
            data={state.videos}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={{ width, height, backgroundColor: "black" }}>
                <Video
                  ref={(ref) => (state.videoRefs.current[index] = ref)}
                  source={{ uri: item.uri }}
                  style={styles.video}
                  resizeMode="cover"
                  repeat
                  paused={state.currentIndex !== index}
                />
              </View>
            )}
            pagingEnabled
            onViewableItemsChanged={state.onViewableItemsChanged.current}
            viewabilityConfig={state.viewConfigRef.current}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.darkContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="lock-closed-outline" size={52} color="#00BFFF" />
          <Text style={styles.darkTitle}>{state.isLoginMode ? "Welcome Back" : "Join the Community"}</Text>
          <Text style={styles.darkSubtitle}>{state.isLoginMode ? "Sign in to continue" : "Create your account below"}</Text>
        </View>

        <View style={styles.darkForm}>
          <DarkField label="Email" value={state.email} placeholder="you@example.com" onChangeText={setters.setEmail} />
          <DarkPasswordField label="Password" value={state.password} onChangeText={setters.setPassword} show={state.showPassword} toggle={() => setters.setShowPassword(!state.showPassword)} />
          {!state.isLoginMode && (
            <DarkPasswordField label="Confirm Password" value={state.confirmPassword} onChangeText={setters.setConfirmPassword} show={state.showConfirmPassword} toggle={() => setters.setShowConfirmPassword(!state.showConfirmPassword)} />
          )}
          {!state.isLoginMode && (
            <>
              <DarkField label="Full Name" value={state.name} onChangeText={setters.setName} />
              <DarkField label="Account" value={state.account} onChangeText={setters.setAccount} keyboardType="numeric" />
              <DarkField label="Age" value={state.age} onChangeText={setters.setAge} keyboardType="numeric" />
            </>
          )}

          <TouchableOpacity style={[styles.darkButton, state.loading && { opacity: 0.6 }]} onPress={state.isLoginMode ? handlers.handleSignIn : handlers.handleSignUp} disabled={state.loading}>
            <Text style={styles.darkButtonText}>{state.isLoginMode ? "Sign In" : "Sign Up"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setters.setIsLoginMode(!state.isLoginMode)}>
            <Text style={styles.switchText}>{state.isLoginMode ? "Don’t have an account? Sign Up" : "Already have one? Sign In"}</Text>
          </TouchableOpacity>

          {state.message && <Text style={[styles.msg, state.message.includes("✅") ? { color: "#4CAF50" } : { color: "#FF5252" }]}>{state.message}</Text>}
        </View>

        {state.loading && <ActivityIndicator size="large" color="#00BFFF" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =======================
// Reusable Inputs
// =======================
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

// =======================
// Styles
// =======================
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
  fullscreenVideo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  video: { width: "100%", height: "100%" },
});
