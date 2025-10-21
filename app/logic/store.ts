// src/logic/storeLogic.ts
import { useState, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  featured?: boolean;
};

export type CartItem = Product & { quantity: number };

export const useStoreLogic = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // ✅ Toast logic
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // ✅ Load products from Firestore
  const loadProducts = async () => {
    try {
      const docRef = doc(db, "phones", "iphone");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const arr: Product[] = [];

        Object.entries(data).forEach(([key, value], index) => {
          if (typeof value === "string" && value.startsWith("http")) {
            arr.push({
              id: key,
              name: `iPhone ${key}`,
              price: (index + 1) * 10,
              image: value,
              description: `Apple iPhone ${key} — sleek and powerful.`,
              featured: (index + 1) % 5 === 0,
            });
          }
        });

        setProducts(arr);
        showToast("📱 Products loaded successfully!", "success");
      } else {
        showToast("⚠️ No document found for phones/iphone", "error");
      }
    } catch {
      showToast("❌ Error loading products", "error");
    }
  };

  // ✅ Realtime listener
  useEffect(() => {
    const docRef = doc(db, "phones", "iphone");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr: Product[] = [];
        Object.entries(data).forEach(([key, value], index) => {
          if (typeof value === "string" && value.startsWith("http")) {
            arr.push({
              id: key,
              name: `iPhone ${key}`,
              price: (index + 1) * 10,
              image: value,
              description: `Apple iPhone ${key} — sleek and powerful.`,
              featured: (index + 1) % 5 === 0,
            });
          }
        });
        setProducts(arr);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ Cart logic
  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    showToast(`${item.name} added 🛒`, "success");
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
    showToast("Removed from cart", "error");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    products,
    filtered,
    cart,
    cartTotal,
    refreshing,
    toast,
    toastAnim,
    search,
    setSearch,
    addToCart,
    removeFromCart,
    onRefresh,
  };
};
