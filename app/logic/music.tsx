import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export const useMediaAutoPlayAds = () => {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);

  const videoRef = useRef<any>(null);

  const fetchUrls = async () => {
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
      if (filtered.length === 0) setErrorLoading("No URLs found in field '1'.");
      setUrls(filtered);
    } catch (err: any) {
      console.error("Error fetching 'ads/paid' document:", err);
      setErrorLoading(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
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

  const handlePrev = () => {
    if (urls.length <= 1) return;
    const prev = (currentIndex - 1 + urls.length) % urls.length;
    setCurrentIndex(prev);
    setPaused(false);
  };

  const handleNext = () => {
    if (urls.length <= 1) return;
    const next = (currentIndex + 1) % urls.length;
    setCurrentIndex(next);
    setPaused(false);
  };

  return {
    state: { urls, loading, currentIndex, paused, muted, errorLoading },
    refs: { videoRef },
    actions: { handleEnd, handleError, togglePaused, toggleMuted, handlePrev, handleNext, fetchUrls },
  };
};
