import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
  AppState,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const ads = [
  {
    id: "1",
    video: "https://xlijah.com/soso.mp4",
    title: "Shop iPhone 16 Now",
    description: "Experience next-level performance with the A18 Pro Chip.",
    link: "https://www.apple.com",
    profile: "https://i.pravatar.cc/100?img=5",
  },
  {
    id: "2",
    video: "https://xlijah.com/soso.mp4",
    title: "Stream Your Favorite Music",
    description: "Join Beats X for unlimited premium tracks.",
    link: "https://www.spotify.com",
    profile: "https://i.pravatar.cc/100?img=11",
  },
  {
    id: "3",
    video: "https://xlijah.com/soso.mp4",
    title: "Upgrade Your Style",
    description: "Discover fashion deals up to 70% off.",
    link: "https://www.jumia.ug",
    profile: "https://i.pravatar.cc/100?img=8",
  },
];

const mainVideo = {
  video: "https://xlijah.com/soso.mp4",
  title: "Main Content Video",
  description: "This is your main content after ads.",
};

export default function AdBanner() {
  const isDark = useColorScheme() === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [showMain, setShowMain] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);

  const appState = useRef(AppState.currentState);

  // Handle app state change to pause/resume video
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState !== "active") setPaused(true);
    else setPaused(false);
  };

  // Animate each ad
  useEffect(() => {
    fadeAnim.setValue(0);
    progressAnim.setValue(0);

    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 10000, useNativeDriver: false }).start();

    setCountdown(10);
    setShowSkip(false);

    const skipTimer = setTimeout(() => setShowSkip(true), 10000);
    const countInterval = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);

    return () => {
      clearTimeout(skipTimer);
      clearInterval(countInterval);
    };
  }, [currentIndex]);

  const handleEnd = () => {
    if (currentIndex < ads.length - 1) setCurrentIndex(currentIndex + 1);
    else setShowMain(true);
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    handleEnd();
  };

  const openLink = async (url: string) => {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (showMain) {
    return (
      <View style={styles.container}>
        <Video
          source={{ uri: mainVideo.video }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={paused}
        />
        <View style={styles.mainOverlay}>
          <Text style={styles.mainTitle}>{mainVideo.title}</Text>
          <Text style={styles.mainDesc}>{mainVideo.description}</Text>
        </View>
      </View>
    );
  }

  const currentAd = ads[currentIndex];
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: isDark ? "#000" : "#fff" }]}>
      <Video
        source={{ uri: currentAd.video }}
        style={styles.video}
        resizeMode="cover"
        paused={paused}
        onEnd={handleEnd}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top Row: Profile avatar & Skip */}
        <View style={styles.topRow}>
          <View style={styles.profileContainer}>
            <Image source={{ uri: currentAd.profile }} style={styles.profilePic} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.channelName}>{currentAd.title}</Text>
              <Text style={styles.desc}>{currentAd.description}</Text>
            </View>
          </View>

          {showSkip && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.8}>
              <Text style={styles.skipText}>Skip Ad</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        {/* Tools for Ad Monetization */}
        <View style={styles.toolsContainer}>
          <Text style={styles.toolsTitle}>Ad Tools & Monetization</Text>
          <TouchableOpacity style={styles.toolButton} activeOpacity={0.8}>
            <Text style={styles.toolText}>Pay for Promotion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} activeOpacity={0.8}>
            <Text style={styles.toolText}>View Ad Stats</Text>
          </TouchableOpacity>
        </View>

        {/* Learn More CTA */}
        <TouchableOpacity style={styles.learnMore} onPress={() => openLink(currentAd.link)} activeOpacity={0.8}>
          <Text style={styles.learnText}>Learn more</Text>
          <Ionicons name="arrow-forward-circle-outline" size={18} color="#00cc66" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Dot Indicators */}
      <View style={styles.indicatorContainer}>
        {ads.map((_, i) => (
          <View key={i} style={[styles.indicator, { backgroundColor: i === currentIndex ? "#00cc66" : "#ccc" }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  video: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profileContainer: { flexDirection: "row", alignItems: "center" },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  channelName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  desc: { color: "#ddd", fontSize: 11 },
  skipButton: { backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  skipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  progressContainer: { height: 3, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden", marginVertical: 6 },
  progressBar: { height: 3, backgroundColor: "#00cc66" },
  toolsContainer: { marginTop: 8, alignItems: "center" },
  toolsTitle: { color: "#00cc66", fontWeight: "700", fontSize: 14, marginBottom: 6 },
  toolButton: { backgroundColor: "#222", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, marginVertical: 3 },
  toolText: { color: "#fff", fontSize: 13 },
  learnMore: { flexDirection: "row", alignItems: "center", marginTop: 8, justifyContent: "center" },

  learnText: { color: "#00cc66", fontWeight: "600" },
  indicatorContainer: { position: "absolute", bottom: 6, flexDirection: "row", justifyContent: "center", width: "100%" },
  indicator: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 4 },
  mainOverlay: { position: "absolute", bottom: 20, left: 20 },
  mainTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  mainDesc: { color: "#ddd", fontSize: 14, marginTop: 4 },
});
