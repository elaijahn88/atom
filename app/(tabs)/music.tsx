// MediaAutoPlayAds.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import Video from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase"; // adjust path to your firebase export
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

export default function MediaAutoPlayAds() {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);

  const videoRef = useRef<Video | null>(null);

  // Fetch the document "paid" from collection "ads" and read field "1" (array)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorLoading(null);
      try {
        const docRef = doc(db, "ads", "paid");
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setErrorLoading("Firestore document 'ads/paid' not found.");
          setUrls([]);
          setLoading(false);
          return;
        }
        const data = snap.data();
        const urlArray = Array.isArray(data?.["1"]) ? data["1"] : [];
        const filtered = urlArray.filter((u: any) => typeof u === "string" && u.length > 0);
        if (filtered.length === 0) {
          setErrorLoading("No URLs found in field '1'.");
        }
        setUrls(filtered);
      } catch (err: any) {
        console.error("Error fetching 'ads/paid' document:", err);
        setErrorLoading(String(err?.message ?? err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // reset playback when URLs update
  useEffect(() => {
    setCurrentIndex(0);
    setPaused(false);
  }, [urls]);

  const handleEnd = () => {
    if (urls.length === 0) return;
    const next = (currentIndex + 1) % urls.length;
    setCurrentIndex(next);
    setTimeout(() => setPaused(false), 50);
  };

  const handleError = (err: any) => {
    console.warn("Video playback error:", err);
    if (urls.length > 1) {
      handleEnd();
    } else {
      Alert.alert("Playback error", "Could not play this media.");
    }
  };

  const togglePaused = () => setPaused((p) => !p);
  const toggleMuted = () => setMuted((m) => !m);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading media...</Text>
      </View>
    );
  }

  if (errorLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: "red", textAlign: "center", marginBottom: 12 }}>
          {errorLoading}
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            setErrorLoading(null);
            (async () => {
              try {
                const docRef = doc(db, "ads", "paid");
                const snap = await getDoc(docRef);
                if (!snap.exists()) {
                  setErrorLoading("Firestore document 'ads/paid' not found.");
                  setUrls([]);
                  setLoading(false);
                  return;
                }
                const data = snap.data();
                const urlArray = Array.isArray(data?.["1"]) ? data["1"] : [];
                const filtered = urlArray.filter((u: any) => typeof u === "string" && u.length > 0);
                if (filtered.length === 0) setErrorLoading("No URLs found in field '1'.");
                setUrls(filtered);
              } catch (err: any) {
                console.error(err);
                setErrorLoading(String(err?.message ?? err));
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (urls.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>No media URLs available in `ads/paid.1`.</Text>
      </View>
    );
  }

  const currentUrl = urls[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        ref={(r) => (videoRef.current = r)}
        source={{ uri: currentUrl }}
        style={styles.video}
        resizeMode="cover"
        paused={paused}
        muted={muted}
        onEnd={handleEnd}
        onError={handleError}
        repeat={false}
      />

      <View style={styles.overlay}>
        <Text numberOfLines={1} style={styles.trackText}>
          Playing {currentIndex + 1} / {urls.length}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => {
              if (urls.length <= 1) return;
              const prev = (currentIndex - 1 + urls.length) % urls.length;
              setCurrentIndex(prev);
              setPaused(false);
            }}
            style={styles.controlBtn}
          >
            <Ionicons name="play-skip-back" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePaused} style={styles.controlBtn}>
            <Ionicons name={paused ? "play" : "pause"} size={48} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (urls.length <= 1) return;
              const next = (currentIndex + 1) % urls.length;
              setCurrentIndex(next);
              setPaused(false);
            }}
            style={styles.controlBtn}
          >
            <Ionicons name="play-skip-forward" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMuted} style={[styles.controlBtn, { marginLeft: 10 }]}>
            <Ionicons name={muted ? "volume-mute" : "volume-high"} size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text numberOfLines={1} style={styles.urlText}>
          {currentUrl}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  video: {
    width,
    height,
    position: "absolute",
    top: 0,
    left: 0,
  },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 18,
  },
  trackText: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 40,
  },
  controlBtn: {
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  urlText: {
    color: "#ddd",
    fontSize: 12,
    marginTop: 12,
    width: "100%",
  },
  retryBtn: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
