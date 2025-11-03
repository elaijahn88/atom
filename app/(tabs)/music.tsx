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
  Slider,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, DocumentData } from "firebase/firestore";
import { Audio } from 'expo-av';

const { width } = Dimensions.get("window");

type Song = {
  id: string;
  url: string;
  likes: number;
  views: number;
  artist: string;
  category: "free" | "paid";
  promotion?: string;
};

export default function MediaLibrary() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "music", "name");
      const snap = await getDoc(docRef);
      const list: Song[] = [];
      if (snap.exists()) {
        const data = snap.data() as DocumentData;
        for (const [songName, songData] of Object.entries(data)) {
          const song = songData as any;
          list.push({
            id: songName,
            url: song.url,
            likes: song.likes || 0,
            views: song.views || 0,
            artist: song.artist || "",
            category: song.category || "paid",
            promotion: song.promotion || undefined,
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
    loadSongs();
    return () => { currentSound?.unloadAsync(); };
  }, []);

  const handlePurchase = async () => {
    if (!selectedSong || paymentAmount <= 0) {
      Alert.alert("Invalid", "Please enter a valid payment amount.");
      return;
    }
    try {
      Alert.alert("Payment Successful", `You paid UGX ${paymentAmount} for ${selectedSong.id}`);
      setModalVisible(false);
      setPaymentAmount(0);
    } catch (err) {
      console.error(err);
      Alert.alert("Payment Failed", "Try again later.");
    }
  };

  const playSong = async (song: Song) => {
    if (currentSound) {
      await currentSound.unloadAsync();
      setIsPlaying(false);
    }
    const { sound, status } = await Audio.Sound.createAsync(
      { uri: song.url },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );
    setCurrentSound(sound);
    setIsPlaying(true);
    setDuration(status.durationMillis || 0);
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setCurrentPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
    }
  };

  const togglePlayPause = async () => {
    if (!currentSound) return;
    if (isPlaying) await currentSound.pauseAsync();
    else await currentSound.playAsync();
  };

  const renderSong = ({ item }: { item: Song }) => (
    <View style={styles.songCard}>
      <View style={styles.songHeader}>
        <Text style={styles.songTitle}>{item.id}</Text>
        <Text style={styles.songCategory}>{item.category.toUpperCase()}</Text>
      </View>
      <Text style={styles.songArtist}>{item.artist}</Text>
      <Text style={styles.songStats}>Likes: {item.likes} | Views: {item.views}</Text>
      {item.promotion && <Text style={styles.promotionText}>{item.promotion}</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <TouchableOpacity style={styles.playBtn} onPress={() => playSong(item)}>
          <Text style={styles.playText}>▶ Play</Text>
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
      {currentSound && <Slider
        style={{ marginTop: 8 }}
        minimumValue={0}
        maximumValue={duration}
        value={currentPosition}
        onSlidingComplete={async (val) => { if(currentSound) await currentSound.setPositionAsync(val); }}
        minimumTrackTintColor="#25D366"
        maximumTrackTintColor="#fff"
      />}
      {currentSound && <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
        <Text style={styles.playText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
      </TouchableOpacity>}
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

      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Purchase {selectedSong?.id}</Text>
            <TextInput
              placeholder="Enter amount in UGX"
              keyboardType="numeric"
              value={paymentAmount ? paymentAmount.toString() : ''}
              onChangeText={(t) => setPaymentAmount(Number(t))}
              style={styles.input}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={handlePurchase}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ccc', marginTop: 8 }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#333', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  songCard: { backgroundColor: '#1f1f1f', padding: 16, borderRadius: 16, marginBottom: 12 },
  songHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  songTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  songCategory: { color: '#25D366', fontWeight: '700', fontSize: 12 },
  songArtist: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  songStats: { color: '#888', fontSize: 12, marginBottom: 8 },
  promotionText: { color: '#ff7f00', fontSize: 14, marginBottom: 6, fontWeight: '700' },
  playBtn: { backgroundColor: '#25D366', paddingVertical: 8, borderRadius: 12, alignItems: 'center', flex: 1, marginRight: 8 },
  playText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  buyBtn: { backgroundColor: '#ff7f00', paddingVertical: 8, borderRadius: 12, alignItems: 'center', flex: 1 },
  buyText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  modalContent: { width: '100%', borderRadius: 16, padding: 18, backgroundColor: '#1c1c1e' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12, color: '#fff', textAlign: 'center' },
  input: { borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#333', color: '#fff' },
  modalBtn: { backgroundColor: '#25D366', padding: 12, borderRadius: 12, alignItems: 'center' },
});
