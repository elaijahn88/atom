import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  AppState,
  Linking,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

export default function MainVideoWithAds() {
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fetch video URLs from Firestore
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const docRef = doc(db, "ads", "paid");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const array = Array.isArray(data?.["1"]) ? data["1"] : [];
          setVideoUrls(array.filter((url) => typeof url === "string"));
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
      }
    };
    fetchVideos();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    setPaused(nextAppState !== "active");
  };

  // Animate fade & progress
  useEffect(() => {
    if (videoUrls.length === 0) return;
    fadeAnim.setValue(0);
    progressAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 30000, useNativeDriver: false }).start(); // placeholder duration
    setShowSkip(false);
    const skipTimer = setTimeout(() => setShowSkip(true), 10000);
    return () => clearTimeout(skipTimer);
  }, [currentIndex, videoUrls]);

  const handleEnd = () => {
    if (currentIndex < videoUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back to first/main video
    }
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    handleEnd();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  if (videoUrls.length === 0) return null;

  const currentVideo = videoUrls[currentIndex];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Video
        source={{ uri: currentVideo }}
        style={styles.video}
        resizeMode="cover"
        paused={paused}
        onEnd={handleEnd}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {showSkip && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.8}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>

      {/* Play/Pause */}
      <TouchableOpacity
        style={styles.playBtn}
        onPress={() => setPaused((p) => !p)}
      >
        <Ionicons name={paused ? "play" : "pause"} size={40} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    justifyContent: "flex-start",
  },
  skipButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  skipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  progressContainer: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#00cc66",
    borderRadius: 2,
  },
  playBtn: {
    position: "absolute",
    bottom: 50,
    left: width / 2 - 20,
  },
});
