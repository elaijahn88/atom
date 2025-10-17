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
import { auth, db } from "../../firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

const mainVideo = {
  video: "https://xlijah.com/soso.mp4",
  title: "Main Content Video",
  description: "This is your main content after ads.",
};

export default function AdBanner() {
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [showMain, setShowMain] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");

  const userId = auth.currentUser?.uid || "guest";

  useEffect(() => {
    // Fetch ads dynamically from Firestore
    const fetchAds = async () => {
      try {
        const docRef = doc(db, "ads", "paid");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const adArray = data?.["1"] || [];
          setAds(adArray);
        } else {
          console.warn("No ads found in Firestore!");
        }
      } catch (err) {
        console.error("Error fetching ads:", err);
      }
    };
    fetchAds();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    setPaused(nextAppState !== "active");
  };

  // Animate fade & progress for each ad
  useEffect(() => {
    if (ads.length === 0) return;
    fadeAnim.setValue(0);
    progressAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 10000, useNativeDriver: false }).start();
    setShowSkip(false);
    setMessage("");

    const skipTimer = setTimeout(() => setShowSkip(true), 10000);
    return () => clearTimeout(skipTimer);
  }, [currentIndex, ads]);

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
    } else {
      setMessage("Cannot open link");
    }
  };

  if (showMain) {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <Video source={{ uri: mainVideo.video }} style={styles.video} resizeMode="cover" repeat paused={paused} />
        <View style={styles.mainOverlay}>
          <Text style={styles.mainTitle}>{mainVideo.title}</Text>
          <Text style={styles.mainDesc}>{mainVideo.description}</Text>
        </View>
      </View>
    );
  }

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: "#000" }]}>
      <Video
        source={{ uri: currentAd.video }}
        style={styles.video}
        resizeMode="cover"
        paused={paused}
        onEnd={handleEnd}
      />
      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <View style={styles.profileContainer}>
            {currentAd.profile && <Image source={{ uri: currentAd.profile }} style={styles.profilePic} />}
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

        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        {currentAd.link && (
          <TouchableOpacity style={styles.learnMore} onPress={() => openLink(currentAd.link)}>
            <Text style={styles.learnText}>Learn more</Text>
            <Ionicons name="arrow-forward-circle-outline" size={18} color="#00cc66" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 120,
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
  learnMore: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8 },
  learnText: { color: "#00cc66", fontWeight: "600" },
  mainOverlay: { position: "absolute", bottom: 20, left: 20 },
  mainTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  mainDesc: { color: "#ddd", fontSize: 14, marginTop: 4 },
});
