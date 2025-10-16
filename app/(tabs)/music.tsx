import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Linking,
  Animated,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import { auth, database, ref, onValue, push } from "../../firebase";

const { width } = Dimensions.get("window");

export default function MusicScreen() {
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showHeart, setShowHeart] = useState(false);
  const [labelMessage, setLabelMessage] = useState("");

  const commentScrollRef = useRef<ScrollView>(null);
  const heartScale = useRef(new Animated.Value(1)).current;

  const videoItem = {
    id: "1",
    title: "Chill Beats",
    artist: "DJ Relax",
    artwork: "https://picsum.photos/400/400?random=11",
    promoVideo: "https://xlijah.com/soso.mp4",
    profilePic: "https://randomuser.me/api/portraits/men/10.jpg",
    links: {
      collaborate: "https://example.com/collab/djrelax",
      produce: "https://example.com/produce/djrelax",
    },
  };

  // Load likes and comments from database
  useEffect(() => {
    const likesRef = ref(database, `likes/${videoItem.id}`);
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const userId = auth.currentUser?.uid || "guest";
      setLiked(!!data[userId]);
      setLikeCount(Object.keys(data).length);
    });

    const commentsRef = ref(database, `comments/${videoItem.id}`);
    const unsubscribeComments = onValue(commentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setComments(Object.values(data));
    });

    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, []);

  // Auto-scroll comments
  useEffect(() => {
    if (commentScrollRef.current) commentScrollRef.current.scrollToEnd({ animated: true });
  }, [comments]);

  // Like button handler with floating heart
  const handleLike = () => {
    const userId = auth.currentUser?.uid || "guest";
    const likesRef = ref(database, `likes/${videoItem.id}/${userId}`);

    setShowHeart(true);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowHeart(false));

    push(likesRef, liked ? null : true);
  };

  // Add comment handler
  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const userId = auth.currentUser?.uid || "guest";
    const commentsRef = ref(database, `comments/${videoItem.id}`);
    push(commentsRef, { userId, text: commentText.trim(), timestamp: Date.now() });
    setCommentText("");
  };

  // Show inline label for temporary messages
  const showLabel = (msg: string) => {
    setLabelMessage(msg);
    setTimeout(() => setLabelMessage(""), 3000);
  };

  // Collaborate button
  const handleCollaborate = async () => {
    const url = videoItem.links.collaborate;
    const userId = auth.currentUser?.uid || "guest";
    try {
      const userActionsRef = ref(database, `users/${userId}/actions`);
      push(userActionsRef, { type: "collaborate", videoId: videoItem.id, timestamp: Date.now() });

      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else showLabel("Cannot open Collaborate link");
    } catch (err) {
      console.log(err);
      showLabel("Error opening Collaborate link");
    }
  };

  // Produce button
  const handleProduce = async () => {
    const url = videoItem.links.produce;
    const userId = auth.currentUser?.uid || "guest";
    try {
      const userActionsRef = ref(database, `users/${userId}/actions`);
      push(userActionsRef, { type: "produce", videoId: videoItem.id, timestamp: Date.now() });

      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else showLabel("Cannot open Produce link");
    } catch (err) {
      console.log(err);
      showLabel("Error opening Produce link");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Inline label */}
      {labelMessage ? (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{labelMessage}</Text>
        </View>
      ) : null}

      {/* Floating heart */}
      {showHeart && (
        <Animated.View
          style={{
            position: "absolute",
            top: 150,
            alignSelf: "center",
            transform: [{ scale: heartScale }],
            zIndex: 2,
          }}
        >
          <Ionicons name="heart" size={80} color="#1DB954" />
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: videoItem.promoVideo }}
            style={styles.playerVideo}
            resizeMode="cover"
            repeat
            paused={paused}
          />
        </View>

        {/* Video Info */}
        <View style={styles.playerInfo}>
          <Image source={{ uri: videoItem.profilePic }} style={styles.profilePic} />
          <Text style={styles.playerTitle}>{videoItem.title}</Text>
          <Text style={styles.playerArtist}>{videoItem.artist}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleLike}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={34} color={liked ? "#1DB954" : "#fff"} />
          </TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 16 }}>{likeCount}</Text>
          <TouchableOpacity onPress={() => setPaused(!paused)}>
            <Ionicons name={paused ? "play-circle" : "pause-circle"} size={68} color="#1DB954" />
          </TouchableOpacity>
        </View>

        {/* Collaborate & Produce */}
        <View style={styles.collabSection}>
          <Text style={styles.collabTitle}>Promote & Collaborate</Text>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 15 }}>
            <TouchableOpacity onPress={handleCollaborate} style={styles.collabButton}>
              <Text style={styles.collabText}>Collaborate</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProduce} style={styles.collabButton}>
              <Text style={styles.collabText}>Produce</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <ScrollView ref={commentScrollRef} style={styles.commentList}>
          {comments.map((c, i) => (
            <View key={i}>
              <Text style={styles.comment}>{c.userId}: {c.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentBox}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#888"
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity onPress={handleAddComment}>
            <Ionicons name="send" size={24} color="#1DB954" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  labelContainer: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#222",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 5,
  },
  labelText: { color: "#fff", fontSize: 14 },
  videoContainer: { marginTop: 20, alignItems: "center" },
  playerVideo: { width: width * 0.9, height: 250, borderRadius: 12 },
  playerInfo: { alignItems: "center", marginVertical: 15 },
  profilePic: { width: 60, height: 60, borderRadius: 30, marginBottom: 10 },
  playerTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  playerArtist: { color: "#aaa", fontSize: 16 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "70%",
    alignSelf: "center",
    marginVertical: 15,
  },
  collabSection: { marginVertical: 15, alignItems: "center" },
  collabTitle: { color: "#1DB954", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  collabButton: { backgroundColor: "#222", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  collabText: { color: "#fff", fontSize: 16 },
  commentList: {
    width: "90%",
    maxHeight: 150,
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
    alignSelf: "center",
    marginTop: 10,
  },
  comment: { color: "#fff", fontSize: 14, marginBottom: 5 },
  commentBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 10,
    width: "90%",
    alignSelf: "center",
  },
  input: { flex: 1, color: "#fff", paddingVertical: 8 },
});
