// MediaPlayerWithInterstitialAds.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase";
import { collection, getDocs, doc, getDoc, setDoc, DocumentData } from "firebase/firestore";

const { width, height } = Dimensions.get("window");
const THRESHOLD = 100;
const SONGS_PER_AD = 2;
const AD_SKIP_TIME = 10000; // 10 seconds

type Song = {
  id: string;
  url: string;
  likes: number;
  views: number;
  artist: string;
  category: "free" | "paid";
};

export default function MediaPlayerWithInterstitialAds() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [ads, setAds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAd, setIsAd] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skipAvailable, setSkipAvailable] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const videoRef = useRef<Video | null>(null);
  const songsPlayedSinceLastAd = useRef(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [songName, setSongName] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [songCategory, setSongCategory] = useState<"free" | "paid">("free");
  const [artistName, setArtistName] = useState("");

  const loadSongs = async () => {
    try {
      const snap = await getDocs(collection(db, "music"));
      const songList: Song[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as DocumentData;
        const mapData = data?.songData;
        if (!mapData || !mapData.url) return;
        if (
          mapData.category === "paid" &&
          (mapData.likes < THRESHOLD && mapData.views < THRESHOLD)
        )
          return;
        songList.push({
          id: docSnap.id,
          url: mapData.url,
          likes: mapData.likes || 0,
          views: mapData.views || 0,
          artist: mapData.artist || "",
          category: mapData.category || "free",
        });
      });
      setSongs(songList);
    } catch (err) {
      console.error("Error fetching music:", err);
      Alert.alert("Error", "Failed to load songs.");
    }
  };

  const loadAds = async () => {
    try {
      const docRef = doc(db, "ads", "paid");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const array = Array.isArray(snap.data()?.["1"]) ? snap.data()["1"] : [];
        setAds(array.filter((url: any) => typeof url === "string"));
      }
    } catch (err) {
      console.error("Error fetching ads:", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadSongs(), loadAds()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const currentMedia = isAd
    ? { url: ads[currentIndex % ads.length] }
    : songs[currentIndex % songs.length];

  const startAdTimer = () => {
    setSkipAvailable(false);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AD_SKIP_TIME,
      useNativeDriver: false,
    }).start(() => setSkipAvailable(true));
  };

  useEffect(() => {
    if (isAd) startAdTimer();
  }, [currentIndex, isAd]);

  const handleEnd = () => {
    if (isAd) {
      setIsAd(false);
      songsPlayedSinceLastAd.current = 0;
      setCurrentIndex((prev) => (prev + 1) % songs.length);
    } else {
      songsPlayedSinceLastAd.current += 1;
      if (songsPlayedSinceLastAd.current >= SONGS_PER_AD && ads.length > 0) {
        setIsAd(true);
        setCurrentIndex(0);
        songsPlayedSinceLastAd.current = 0;
      } else {
        setCurrentIndex((prev) => (prev + 1) % songs.length);
      }
    }
    setPaused(false);
  };

  const togglePaused = () => setPaused((p) => !p);

  const handleSkipAd = () => {
    if (skipAvailable) handleEnd();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const addSong = async () => {
    if (!songName.trim() || !songUrl.trim() || !artistName.trim()) {
      Alert.alert("Incomplete", "Fill all fields to add a song.");
      return;
    }
    try {
      const docRef = doc(db, "music", songName.trim());
      await setDoc(docRef, {
        songData: {
          url: songUrl.trim(),
          likes: 0,
          views: 0,
          artist: artistName.trim(),
          category: songCategory,
        },
      });
      Alert.alert("Success", `Song "${songName}" added!`);
      setSongName(""); setSongUrl(""); setArtistName(""); setSongCategory("free"); setModalVisible(false);
      loadSongs();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to add song.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading media...</Text>
      </View>
    );
  }

  if (!currentMedia?.url) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>No media available.</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Text style={{ color: "#fff" }}>Add Song</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={(r) => (videoRef.current = r)}
        source={{ uri: currentMedia.url }}
        style={styles.video}
        resizeMode="cover"
        paused={paused}
        onEnd={handleEnd}
      />

      <View style={styles.overlay}>
        <Text style={styles.trackText}>
          {isAd
            ? `Ad ${currentIndex + 1} / ${ads.length}`
            : `${currentMedia.id} (${currentMedia.category}) - ${currentMedia.artist}`}
        </Text>
        {!isAd && (
          <Text style={styles.trackText}>
            Likes: {currentMedia.likes} | Views: {currentMedia.views}
          </Text>
        )}

        {isAd && (
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            {skipAvailable && (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkipAd}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() =>
              setCurrentIndex((prev) =>
                (prev - 1 + (isAd ? ads.length : songs.length)) %
                (isAd ? ads.length : songs.length)
              )
            }
            style={styles.controlBtn}
          >
            <Ionicons name="play-skip-back" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePaused} style={styles.controlBtn}>
            <Ionicons name={paused ? "play" : "pause"} size={48} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              setCurrentIndex((prev) => (prev + 1) % (isAd ? ads.length : songs.length))
            }
            style={styles.controlBtn}
          >
            <Ionicons name="play-skip-forward" size={36} color="#fff" />
          </TouchableOpacity>
        </View>

        {!isAd && (
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Text style={{ color: "#fff" }}>Add New Song</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Song</Text>
            <TextInput placeholder="Song Name" value={songName} onChangeText={setSongName} style={styles.input} />
            <TextInput placeholder="Song URL" value={songUrl} onChangeText={setSongUrl} style={styles.input} />
            <TextInput placeholder="Artist" value={artistName} onChangeText={setArtistName} style={styles.input} />
            <TextInput placeholder="Category (free/paid)" value={songCategory} onChangeText={(t) => setSongCategory(t as "free" | "paid")} style={styles.input} />
            <TouchableOpacity style={styles.modalBtn} onPress={addSong}>
              <Text style={{ color: "#fff" }}>Add Song</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 8 }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#333" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  video: { width, height, position: "absolute", top: 0, left: 0 },
  overlay: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center", paddingHorizontal: 18 },
  trackText: { color: "#fff", fontWeight: "700", marginBottom: 8, fontSize: 16 },
  controls: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 40, marginBottom: 12 },
  controlBtn: { marginHorizontal: 10, alignItems: "center", justifyContent: "center" },
  addBtn: { backgroundColor: "#25D366", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 12 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 20 },
  modalContent: { width: "100%", borderRadius: 16, padding: 18, backgroundColor: "#1c1c1e" },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12, color: "#fff", textAlign: "center" },
  input: { borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: "#333", color: "#fff" },
  modalBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center" },
  progressContainer: { width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, marginTop: 12, overflow: "hidden" },
  progressBar: { height: 6, backgroundColor: "#00cc66", borderRadius: 3 },
  skipBtn: { position: "absolute", right: 12, top: -30, backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  skipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
