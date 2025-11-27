import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  AppState,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Video from "react-native-video";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const { width, height } = Dimensions.get("window");

type VideoItem = {
  url: string;
  owner: string;
  price: number;
};

export default function AdvancedVideoAds() {
  const [videoUrls, setVideoUrls] = useState<VideoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);

  // Fetch current logged-in user from Firebase Auth
  useEffect(() => {
    const fetchUser = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      const docRef = doc(db, "acc", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setCurrentUser({ ...snap.data(), uid: user.uid });
        setBalance(snap.data().net || 0);
      }
    };
    fetchUser();
  }, []);

  // Fetch paid video ads
  const fetchVideos = async () => {
    try {
      const docRef = doc(db, "ads", "paid");
      const snap = await getDoc(docRef);
      const list: VideoItem[] = [];
      if (snap.exists()) {
        const data = snap.data();
        if (data["1"] && Array.isArray(data["1"])) {
          data["1"].forEach((item: any) => {
            if (item.url && item.owner && typeof item.price === "number") {
              list.push(item);
            }
          });
        }
      }
      if (list.length === 0)
        list.push({ url: "https://xlijah.com/mp3/go.mp3", owner: "admin", price: 0 });
      setVideoUrls(list);
    } catch (err) {
      console.error("Error fetching videos:", err);
      setVideoUrls([{ url: "https://xlijah.com/mp3/go.mp3", owner: "admin", price: 0 }]);
    }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 120000); // refresh every 2 min
    return () => clearInterval(interval);
  }, []);

  // Handle app pause/resume
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setPaused(nextAppState !== "active");
    });
    return () => subscription.remove();
  }, []);

  // Animate progress and fade
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

  const handlePurchase = async (video: VideoItem) => {
    if (!currentUser) return Alert.alert("Login Required", "Please login to purchase.");
    if ((balance || 0) < video.price) return Alert.alert("Insufficient Funds", "Top up your account first.");

    try {
      // Deduct from current user
      const userRef = doc(db, "acc", currentUser.uid);
      const newBalance = balance - video.price;
      await updateDoc(userRef, {
        net: newBalance,
        transactions: [
          ...(currentUser.transactions || []),
          {
            type: "purchase",
            video: video.url,
            amount: video.price,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      setBalance(newBalance);

      // Credit owner
      const ownerRef = doc(db, "acc", video.owner.toLowerCase());
      const ownerSnap = await getDoc(ownerRef);
      if (ownerSnap.exists()) {
        const ownerData = ownerSnap.data();
        const ownerNet = (ownerData.net || 0) + video.price;
        await updateDoc(ownerRef, {
          net: ownerNet,
          transactions: [
            ...(ownerData.transactions || []),
            {
              type: "earning",
              from: currentUser.Name,
              video: video.url,
              amount: video.price,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }

      Alert.alert("Payment Successful", `You paid UGX ${video.price} for this video!`);
    } catch (err) {
      console.error(err);
      Alert.alert("Payment Failed", "Try again later.");
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  if (videoUrls.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Video
        source={{ uri: videoUrls[currentIndex].url }}
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

      {/* Buy button for paid videos */}
      {videoUrls[currentIndex].price > 0 && (
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => handlePurchase(videoUrls[currentIndex])}
        >
          <Text style={styles.buyText}>Buy UGX {videoUrls[currentIndex].price}</Text>
        </TouchableOpacity>
      )}

      {/* Info Overlay */}
      <View style={styles.infoOverlay} pointerEvents="none">
        <Text style={styles.infoText}>Ad {currentIndex + 1} of {videoUrls.length}</Text>
        <Text style={styles.infoText}>Balance: UGX {balance?.toFixed(2)}</Text>
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
  buyBtn: {
    position: "absolute",
    bottom: 50,
    right: 20,
    backgroundColor: "#ff7f00",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  buyText: { color: "#fff", fontWeight: "700" },
  infoOverlay: { position: "absolute", top: 10, left: 20 },
  infoText: { color: "#00cc66", fontWeight: "600" },
});
