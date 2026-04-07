import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
} from "react-native";
import * as Device from "expo-device";
import Video from "react-native-video";
import { loginOrCreateUser, withdrawMoney, UserAccount } from "../lib/acc";

const { width, height } = Dimensions.get("window");

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

type CartItem = Product & { quantity: number };

export default function Marketplace() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [toast, setToast] = useState({ message: "", visible: false });
  const toastAnim = useMemo(() => new Animated.Value(0), []);

  const [videoVisible, setVideoVisible] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  const CATEGORIES = ["shoes", "phones", "gadgets", "others"];

  useEffect(() => {
    const init = async () => {
      const u = await loginOrCreateUser("Guest");
      setUser(u);
      setBalance(u.balance);
      generateProducts();
    };
    init();
  }, []);

  const generateProducts = () => {
    const list: Product[] = [];
    for (let i = 0; i < 20; i++) {
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      list.push({
        id: i.toString(),
        name: `${cat.toUpperCase()} ITEM`,
        price: Math.floor(Math.random() * 4000000) + 50000,
        category: cat,
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
      });
    }
    setProducts(list);
  };

  const playVideo = () => {
    setVideoKey((prev) => prev + 1);
    setVideoVisible(true);
    setTimeout(() => setVideoVisible(false), 50000);
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToast({ message: "", visible: false }));
      }, 2000);
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory ? p.category === selectedCategory : true;
    return matchSearch && matchCat;
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    playVideo();
    const exists = cart.find((c) => c.id === product.id);
    const updated = exists
      ? cart.map((c) =>
          c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      : [...cart, { ...product, quantity: 1 }];
    setCart(updated);
    showToast(`Added ${product.name}`);
  };

  const toggleFavorite = (product: Product) => {
    const exists = favorites.find((f) => f.id === product.id);
    const updated = exists
      ? favorites.filter((f) => f.id !== product.id)
      : [...favorites, product];
    setFavorites(updated);
    showToast(exists ? "Removed from favorites" : "Added to favorites");
    playVideo();
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    showToast("Item removed from cart");
  };

  const checkout = async () => {
    if (!user || cart.length === 0) return;
    if (totalAmount > balance) {
      showToast("Insufficient balance");
      return;
    }

    try {
      playVideo();
      const newBalance = await withdrawMoney(totalAmount);
      setBalance(newBalance);
      setCart([]);
      setCheckoutModalVisible(false);
      showToast(`Payment successful! UGX ${totalAmount.toLocaleString()}`);
    } catch (err: any) {
      showToast(err.message || "Checkout failed");
    }
  };

  // Mini cart preview items (first 2)
  const miniCartItems = cart.slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Main Scrollable Content */}
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.balance}>Balance: UGX {balance.toLocaleString()}</Text>

        <TextInput
          placeholder="Search products..."
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, paddingHorizontal: 15 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              style={[styles.cat, selectedCategory === cat && { backgroundColor: "#32CD32" }]}
            >
              <Text style={{ color: "#fff", textTransform: "capitalize" }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.productsGrid}>
          {filteredProducts.map((item) => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.img} />
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>UGX {item.price.toLocaleString()}</Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.btn} onPress={() => addToCart(item)}>
                  <Text style={{ color: "#fff", fontSize: 18 }}>🛒</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "pink" }]}
                  onPress={() => toggleFavorite(item)}
                >
                  <Text style={{ color: "#fff", fontSize: 18 }}>❤️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom Cart Bar with Mini Preview */}
      {cart.length > 0 && (
        <View style={styles.bottomCartBar}>
          <View style={styles.miniCartPreview}>
            {miniCartItems.map((item, index) => (
              <Text key={index} style={styles.miniCartText} numberOfLines={1}>
                {item.name} ×{item.quantity}
              </Text>
            ))}
            {cart.length > 2 && (
              <Text style={styles.miniCartText}>+{cart.length - 2} more</Text>
            )}
          </View>

          <View style={styles.cartSummary}>
            <Text style={styles.totalText}>
              UGX {totalAmount.toLocaleString()}
            </Text>
            <TouchableOpacity 
              style={styles.checkoutBtn} 
              onPress={() => setCheckoutModalVisible(true)}
            >
              <Text style={styles.checkoutText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={checkoutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout</Text>

            <ScrollView style={styles.cartItemsList}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItemRow}>
                  <Image source={{ uri: item.image }} style={styles.cartItemImage} />
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      UGX {(item.price * item.quantity).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.quantityControls}>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Text style={styles.quantityBtn}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Text style={styles.quantityBtn}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalTotal}>
              <Text style={styles.modalTotalLabel}>Total Amount</Text>
              <Text style={styles.modalTotalAmount}>
                UGX {totalAmount.toLocaleString()}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setCheckoutModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmCheckoutBtn} 
                onPress={checkout}
              >
                <Text style={styles.confirmText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Overlay */}
      {videoVisible && (
        <View style={styles.videoContainer}>
          <Video
            key={videoKey}
            source={{ uri: "https://www.w3schools.com/html/mov_bbb.mp4" }}
            style={styles.video}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Toast */}
      {toast.visible && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={{ color: "#fff", fontWeight: "500" }}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },

  balance: { 
    color: "#32CD32", 
    fontSize: 18, 
    fontWeight: "bold", 
    padding: 15,
    paddingBottom: 5 
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 12,
  },
  cat: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10 },
  card: {
    flexBasis: "48%",
    backgroundColor: "#1E1E1E",
    margin: "1%",
    padding: 10,
    borderRadius: 12,
  },
  img: { width: "100%", height: 130, borderRadius: 10 },
  name: { color: "#fff", marginTop: 8, fontSize: 14, fontWeight: "500" },
  price: { color: "#32CD32", marginVertical: 4, fontWeight: "600" },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  btn: {
    backgroundColor: "#32CD32",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 2,
    alignItems: "center",
  },

  /* Bottom Bar */
  bottomCartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },
  miniCartPreview: { flex: 1, paddingRight: 12 },
  miniCartText: { color: "#ccc", fontSize: 13, marginBottom: 2 },
  cartSummary: { alignItems: "flex-end" },
  totalText: { color: "#fff", fontSize: 17, fontWeight: "bold", marginBottom: 6 },
  checkoutBtn: {
    backgroundColor: "#32CD32",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  checkoutText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  cartItemsList: {
    maxHeight: height * 0.45,
    paddingHorizontal: 20,
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cartItemName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  cartItemPrice: {
    color: "#32CD32",
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 10,
  },
  quantityBtn: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 10,
  },
  quantityText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  removeBtn: {
    color: "#ff4444",
    fontSize: 20,
    padding: 8,
  },
  modalTotal: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTotalLabel: { color: "#aaa", fontSize: 16 },
  modalTotalAmount: { color: "#32CD32", fontSize: 20, fontWeight: "bold" },

  modalButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: "#333",
    borderRadius: 12,
    alignItems: "center",
  },
  confirmCheckoutBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: "#32CD32",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelText: { color: "#fff", fontWeight: "600" },
  confirmText: { color: "#000", fontWeight: "bold", fontSize: 16 },

  /* Toast & Video */
  toast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#333",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    zIndex: 1000,
  },
  videoContainer: {
    position: "absolute",
    top: height / 4,
    left: width / 8,
    width: width * 0.75,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 999,
  },
  video: { width: "100%", height: "100%" },
});
