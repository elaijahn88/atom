import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Video from "react-native-video";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

export default function AdvancedVideoAds() {
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch video URLs from ads/paid collection
  const fetchVideos = async () => {
    try {
      const docRef = doc(db, "ads", "paid");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const urls: string[] = [];
        if (data["1"] && Array.isArray(data["1"])) {
          data["1"].forEach((item: any) => {
            if (typeof item === "string" && item.trim()) urls.push(item);
          });
        }
        if (urls.length === 0) urls.push("https://xlijah.com/mp3/go.mp3");
        setVideoUrls(urls);
      } else {
        setVideoUrls(["https://xlijah.com/mp3/go.mp3"]);
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
      setVideoUrls(["https://xlijah.com/mp3/go.mp3"]);
    }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setPaused(nextAppState !== "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (videoUrls.length === 0) return;
    fadeAnim.setValue(0);
    progressAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 30000, useNativeDriver: false }).start();
    setShowSkip(false);
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    skipTimeoutRef.current = setTimeout(() => setShowSkip(true), 10000);
  }, [currentIndex, videoUrls]);

  const handleEnd = () => {
    setCurrentIndex((prev) => (prev + 1) % videoUrls.length);
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    handleEnd();
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  if (videoUrls.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Video
        source={{ uri: videoUrls[currentIndex] }}
        style={styles.video}
        resizeMode="cover"
        paused={paused}
        onEnd={handleEnd}
        repeat={false}
        controls={false}
      />

      {/* Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {showSkip && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.8}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>

      {/* Play/Pause Control */}
      <TouchableOpacity style={styles.playBtn} onPress={() => setPaused((p) => !p)}>
        <Ionicons name={paused ? "play" : "pause"} size={40} color="#00cc66" />
      </TouchableOpacity>

      {/* Info Overlay */}
      <View style={styles.infoOverlay} pointerEvents="none">
        <Text style={styles.infoText}>Ad {currentIndex + 1} of {videoUrls.length}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: "#000" },
  video: { width, height, backgroundColor: "#111" },
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    marginBottom: 8,
  },
  skipText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  progressContainer: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 6,
  },
  progressBar: { height: 4, backgroundColor: "#00cc66", borderRadius: 2 },
  playBtn: { position: "absolute", bottom: 50, left: width / 2 - 20 },
  infoOverlay: { position: "absolute", top: 10, left: 20 },
  infoText: { color: "#00cc66", fontWeight: "600" },
});
