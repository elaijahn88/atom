import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  useColorScheme,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Video from 'react-native-video'; // Import react-native-video

const { height, width } = Dimensions.get("window");

type MediaItem = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  audioUrl: string;
  promoVideo?: string;
  price?: number;
};

const mediaData: MediaItem[] = [
  {
    id: "1",
    title: "Chill Beats",
    artist: "DJ Relax",
    artwork: "https://picsum.photos/300/300?random=1",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    promoVideo: "https://xlijah.com/soso.mp4",
    price: 2.5,
  },
  {
    id: "2",
    title: "Upbeat Energy",
    artist: "Electro Vibes",
    artwork: "https://picsum.photos/300/300?random=2",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    price: 1.0,
  },
  {
    id: "3",
    title: ".......",
    artist: "Sunny Tunes",
    artwork: "https://picsum.photos/300/300?random=3",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    promoVideo: "https://xlijah.com/soso.mp4",
    price: 3.0,
  },
];

export default function MediaFeed() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const [doubleTapLike, setDoubleTapLike] = useState<{ [key: string]: boolean }>({});
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftAmount, setGiftAmount] = useState<number>(0);
  const [promoAccepted, setPromoAccepted] = useState(false);

  const videoRefs = useRef<Array<any>>([]);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Spin animation for album artwork
  const startSpin = () => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  useEffect(() => {
    startSpin();
  }, [currentIndex]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  const handleDoubleTap = (item: MediaItem) => {
    setLikes({ ...likes, [item.id]: true });
    setDoubleTapLike({ ...doubleTapLike, [item.id]: true });
    setTimeout(() => {
      setDoubleTapLike({ ...doubleTapLike, [item.id]: false });
    }, 1000);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
      setPaused(false);
    }
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 80 });

  const handleSendGift = () => {
    alert(`Gift of $${giftAmount.toFixed(2)} sent to creator!`);
    setGiftModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#f9f9f9" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <FlatList
        ref={flatListRef}
        data={mediaData}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        renderItem={({ item, index }) => (
          <TouchableWithoutFeedback onPress={() => handleDoubleTap(item)}>
            <Animated.View
              style={[
                styles.card,
                { opacity: index === currentIndex ? fadeAnim : 0 },
              ]}
            >
              {/* Video or audio */}
              {item.promoVideo ? (
                <Video
                  source={{ uri: item.promoVideo }}
                  ref={(ref) => (videoRefs.current[index] = ref)}
                  style={styles.video}
                  resizeMode="cover"
                  repeat
                  paused={index !== currentIndex || paused}
                />
              ) : (
                <Video
                  source={{ uri: item.audioUrl }}
                  ref={(ref) => (videoRefs.current[index] = ref)}
                  style={styles.video}
                  audioOnly
                  paused={index !== currentIndex || paused}
                />
              )}

              {/* Overlay */}
              <View style={styles.overlay}>
                <Text style={[styles.title, { color: "#fff" }]}>{item.title}</Text>
                <Text style={[styles.artist, { color: "#ccc" }]}>{item.artist}</Text>

                {/* Play/Pause */}
                <TouchableOpacity
                  style={styles.playPauseBtn}
                  onPress={() => setPaused(!paused)}
                >
                  <Ionicons
                    name={paused || index !== currentIndex ? "play-circle" : "pause-circle"}
                    size={60}
                    color="#fff"
                  />
                </TouchableOpacity>

                {/* Social Buttons */}
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => setLikes({ ...likes, [item.id]: !likes[item.id] })}
                  >
                    <Ionicons
                      name={likes[item.id] ? "heart" : "heart-outline"}
                      size={32}
                      color={likes[item.id] ? "red" : "#fff"}
                    />
                    <Text style={styles.socialText}>Like</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => setGiftModalVisible(true)}
                  >
                    <Ionicons name="gift" size={32} color="#fff" />
                    <Text style={styles.socialText}>Gift</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialBtn}>
                    <Ionicons name="chatbubble-outline" size={32} color="#fff" />
                    <Text style={styles.socialText}>Comment</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialBtn}>
                    <MaterialIcons name="share" size={32} color="#fff" />
                    <Text style={styles.socialText}>Share</Text>
                  </TouchableOpacity>

                  {/* Accept Promotions Button */}
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => setPromoAccepted(true)}
                  >
                    <MaterialIcons name="campaign" size={32} color="#fff" />
                    <Text style={styles.socialText}>Accept Promotions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        )}
      />

      {/* Gift Modal */}
      <Modal visible={giftModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send a Gift</Text>
            <Text style={styles.modalSubtitle}>
              Enter amount in USD or choose preset
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
              {[1, 2, 5, 10].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.giftAmountBtn,
                    giftAmount === amount && { backgroundColor: "#25D366" },
                  ]}
                  onPress={() => setGiftAmount(amount)}
                >
                  <Text style={styles.giftAmountText}>${amount}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#25D366" }]}
              onPress={handleSendGift}
            >
              <Text style={styles.modalButtonText}>
                Send ${giftAmount || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#ccc" }]}
              onPress={() => setGiftModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: "#333" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Promotion Accepted Modal */}
      <Modal visible={promoAccepted} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Promotions Accepted!</Text>
            <Text style={styles.modalSubtitle}>
              You will start receiving exclusive offers, discounts, and special sounds.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#25D366" }]}
              onPress={() => setPromoAccepted(false)}
            >
              <Text style={styles.modalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    width,
    height,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#000",
  },
  video: {
    width,
    height,
    position: "absolute",
    top: 0,
    left: 0,
  },
  overlay: {
    width,
    padding: 20,
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  artist: {
    fontSize: 16,
    marginBottom: 12,
  },
  playPauseBtn: {
    alignSelf: "center",
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    width: "90%",
  },
  socialBtn: {
    alignItems: "center",
    marginHorizontal: 6,
  },
  socialText: {
    color: "#fff",
    marginTop: 4,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  giftAmountBtn: {
    backgroundColor: "#eee",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  giftAmountText: { fontSize: 16, fontWeight: "700" },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
