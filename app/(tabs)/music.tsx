import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Video from "react-native-video";
import { getAuth } from "firebase/auth";

const { width } = Dimensions.get("window");

type Song = {
  id: string;
  url: string;
  likes: number;
  views: number;
  artist: string;
  category: "free" | "paid";
  promotion?: string;
  owner: string;
};

export default function MediaLibrary() {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const videoRef = useRef<Video>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
  };

  const loadUserLikes = async () => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, "acc", currentUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserLikes(data.likes || []);
      }
    } catch (err) {
      console.error("Failed to fetch user likes:", err);
    }
  };

  const loadSongs = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "music", "name");
      const snap = await getDoc(docRef);
      const list: Song[] = [];
      if (snap.exists()) {
        const data = snap.data();
        for (const [songName, songData] of Object.entries(data)) {
          const s = songData as any;
          list.push({
            id: songName,
            url: s.url,
            likes: s.likes || 0,
            views: s.views || 0,
            artist: s.artist || "",
            category: s.category || "paid",
            promotion: s.promotion,
            owner: s.owner || "",
          });
        }
      }
      setSongs(list);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load songs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserLikes();
    loadSongs();
  }, []);

  const handlePurchase = async () => {
    if (!selectedSong || paymentAmount <= 0 || !currentUser) {
      Alert.alert("Invalid", "Please enter a valid payment amount.");
      return;
    }
    try {
      const ownerRef = doc(db, "acc", selectedSong.owner);
      const ownerSnap = await getDoc(ownerRef);
      if (ownerSnap.exists()) {
        const ownerData = ownerSnap.data();
        const newNet = (ownerData.net || 0) + paymentAmount;
        await updateDoc(ownerRef, { net: newNet });
      }

      Alert.alert(
        "Payment Successful",
        `You paid UGX ${paymentAmount} for ${selectedSong.id}`
      );
      setModalVisible(false);
      setPaymentAmount(0);
    } catch (err) {
      console.error(err);
      Alert.alert("Payment Failed", "Try again later.");
    }
  };

  const playSong = async (song: Song) => {
    if (!song) return;
    setCurrentSong(song);
    setIsPlaying(true);

    try {
      const songDocRef = doc(db, "music", "name");
      await updateDoc(songDocRef, { [`${song.id}.views`]: song.views + 1 });
      setSongs((prev) =>
        prev.map((s) =>
          s.id === song.id ? { ...s, views: s.views + 1 } : s
        )
      );
    } catch (err) {
      console.error("Failed to update views:", err);
    }
  };

  const togglePlayPause = () => setIsPlaying((prev) => !prev);

  const handleLike = async (song: Song) => {
    if (!currentUser) return;
    const songDocRef = doc(db, "music", "name");
    const userDocRef = doc(db, "acc", currentUser.uid);

    try {
      let updatedUserLikes = [...userLikes];
      if (userLikes.includes(song.id)) {
        await updateDoc(songDocRef, { [`${song.id}.likes`]: song.likes - 1 });
        updatedUserLikes = updatedUserLikes.filter((id) => id !== song.id);
      } else {
        await updateDoc(songDocRef, { [`${song.id}.likes`]: song.likes + 1 });
        updatedUserLikes.push(song.id);
      }
      await updateDoc(userDocRef, { likes: updatedUserLikes });
      setUserLikes(updatedUserLikes);
      setSongs((prev) =>
        prev.map((s) =>
          s.id === song.id
            ? {
                ...s,
                likes: userLikes.includes(song.id)
                  ? song.likes - 1
                  : song.likes + 1,
              }
            : s
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const renderSong = ({ item }: { item: Song }) => (
    <View style={styles.songCard}>
      <View style={styles.songHeader}>
        <Text style={styles.songTitle}>{item.id}</Text>
        <Text style={styles.songCategory}>{item.category.toUpperCase()}</Text>
      </View>
      <Text style={styles.songArtist}>{item.artist}</Text>
      <Text style={styles.songStats}>
        Likes: {item.likes} | Views: {item.views}
      </Text>
      {item.promotion && (
        <Text style={styles.promotionText}>{item.promotion}</Text>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <TouchableOpacity style={styles.playBtn} onPress={() => playSong(item)}>
          <Text style={styles.playText}>▶ Play</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.likeBtn,
            { backgroundColor: userLikes.includes(item.id) ? "#FF0000" : "#333" },
          ]}
          onPress={() => handleLike(item)}
        >
          <Text style={styles.likeText}>♥ Like</Text>
        </TouchableOpacity>
        {item.category === "paid" && (
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => {
              setSelectedSong(item);
              setModalVisible(true);
            }}
          >
            <Text style={styles.buyText}>Buy</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading media...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderSong}
        contentContainerStyle={{ padding: 16 }}
      />

      {currentSong && (
        <View style={{ padding: 16 }}>
          <Video
            ref={videoRef}
            source={{ uri: currentSong.url }}
            audioOnly={true}
            paused={!isPlaying}
            onProgress={({ currentTime }) => setCurrentPosition(currentTime)}
            onLoad={({ duration }) => setDuration(duration)}
            onEnd={() => setIsPlaying(false)}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#fff" }}>{formatTime(currentPosition)}</Text>
            <Text style={{ color: "#fff" }}>{formatTime(duration)}</Text>
          </View>
          <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
            <Text style={styles.playText}>{isPlaying ? "⏸ Pause" : "▶ Play"}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Purchase {selectedSong?.id}</Text>
            <TextInput
              placeholder="Enter amount in UGX"
              keyboardType="numeric"
              value={paymentAmount ? paymentAmount.toString() : ""}
              onChangeText={(t) => setPaymentAmount(Number(t))}
              style={styles.input}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={handlePurchase}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 8 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#333", fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#fff", marginTop: 12, fontSize: 16 },
  songCard: { backgroundColor: "#1f1f1f", padding: 16, borderRadius: 16, marginBottom: 12 },
  songHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  songTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  songCategory: { color: "#25D366", fontWeight: "700", fontSize: 12 },
  songArtist: { color: "#ccc", fontSize: 14, marginBottom: 4 },
  songStats: { color: "#888", fontSize: 12, marginBottom: 8 },
  promotionText: { color: "#ff7f00", fontSize: 14, marginBottom: 6, fontWeight: "700" },
  playBtn: { backgroundColor: "#25D366", paddingVertical: 8, borderRadius: 12, alignItems: "center", flex: 1, marginRight: 8 },
  playText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  buyBtn: { backgroundColor: "#ff7f00", paddingVertical: 8, borderRadius: 12, alignItems: "center", flex: 1 },
  buyText: { color: "#fff", fontWeight: "700" },
  likeBtn: { padding: 8, borderRadius: 12, alignItems: "center", flex: 1, marginHorizontal: 4 },
  likeText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 20 },
  modalContent: { width: "100%", borderRadius: 16, padding: 18, backgroundColor: "#1c1c1e" },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12, color: "#fff", textAlign: "center" },
  input: { borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: "#333", color: "#fff" },
  modalBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center" },
});
