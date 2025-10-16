import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../../firebase"; // your firebase config
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function Store() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);

  const currentUserEmail = auth.currentUser?.email || "guest@example.com";
  const safeEmail = currentUserEmail.replace(".", "_"); // safe for Firestore doc

  // 🖼️ Load product images
  useEffect(() => {
    const imgs = Array.from({ length: 5 }, (_, i) => ({
      id: i + 12,
      title: `iPhone ${i + 12}`,
      image: `https://xlijah.com/pics/phones/iphone/${i + 12}.jpg`,
      price: 1000 + i * 100,
      desc: `High-quality iPhone ${i + 12} with amazing specs.`,
    }));
    setProducts(imgs);
  }, []);

  // 🔔 Real-time balance listener from Firestore
  useEffect(() => {
    const userRef = doc(db, "users", safeEmail);

    const setupUser = async () => {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        // Create user with 5 random characters and zero balance
        const randomId = Math.random().toString(36).substring(2, 7);
        await setDoc(userRef, { balance: 0, randomId, email: currentUserEmail });
        setBalance(0);
      } else {
        const data = docSnap.data();
        // add randomId if missing
        if (!data.randomId) {
          const randomId = Math.random().toString(36).substring(2, 7);
          await updateDoc(userRef, { randomId });
        }
        setBalance(data.balance || 0);
      }
    };

    setupUser();

    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        const data = docSnap.data();
        if (data) {
          setBalance(data.balance);
          showMessage("Balance updated!", "success");
        }
      },
      (err) => {
        console.error("Balance listener error", err);
        showMessage("Failed to load balance", "error");
      }
    );

    return () => unsubscribe();
  }, [safeEmail]);

  // 🧾 Label message handler
  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // 🛒 Add to cart
  const addToCart = (item: any) => {
    const exists = cart.find((c) => c.id === item.id);
    if (exists) {
      showMessage("Already in cart", "error");
      return;
    }
    setCart([...cart, item]);
    showMessage("Added to cart", "success");
  };

  // 💳 Handle Payment
  const handlePayment = async () => {
    if (cart.length === 0) {
      showMessage("Cart is empty!", "error");
      return;
    }
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (balance < total) {
      showMessage("Insufficient balance!", "error");
      return;
    }
    try {
      const userRef = doc(db, "users", safeEmail);
      await updateDoc(userRef, { balance: balance - total });
      setCart([]);
      showMessage("Payment successful! 🎉", "success");
    } catch (err) {
      console.error("Payment error", err);
      showMessage("Payment failed", "error");
    }
  };

  // 🔄 Refresh
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showMessage("Products refreshed", "success");
    }, 1500);
  };

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setModalVisible(true);
      }}
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.price}>${item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* 🏷️ Message Label */}
        {message && (
          <Text
            style={[
              styles.label,
              message.type === "success" ? styles.success : styles.error,
            ]}
          >
            {message.text}
          </Text>
        )}

        {/* 💰 Balance */}
        <View style={styles.balanceBar}>
          <Ionicons name="wallet-outline" size={20} color="#007AFF" />
          <Text style={styles.balanceText}>Balance: ${balance.toFixed(2)}</Text>
        </View>

        {/* 🔍 Search */}
        <TextInput
          style={styles.search}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
        />

        {/* 🛍️ Product list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        />

        {/* 🛒 Cart footer */}
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>Cart: {cart.length} items</Text>
          <TouchableOpacity style={styles.payBtn} onPress={handlePayment}>
            <Ionicons name="card-outline" size={22} color="#fff" />
            <Text style={styles.payText}>Pay</Text>
          </TouchableOpacity>
        </View>

        {/* 🪟 Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              {selectedItem && (
                <>
                  <Image
                    source={{ uri: selectedItem.image }}
                    style={styles.modalImage}
                  />
                  <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                  <Text style={styles.modalDesc}>{selectedItem.desc}</Text>
                  <Text style={styles.modalPrice}>${selectedItem.price}</Text>
                  <TouchableOpacity
                    style={styles.cartButton}
                    onPress={() => {
                      addToCart(selectedItem);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.cartButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0b", // dark background
    paddingTop: 40,
  },
  list: {
    paddingBottom: 120,
  },
  card: {
    width: width / 2 - 20,
    backgroundColor: "#111",
    margin: 8,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 10,
  },
  title: {
    marginTop: 8,
    fontWeight: "bold",
    fontSize: 14,
    color: "#fff",
  },
  price: {
    color: "#10B981",
    marginTop: 4,
    fontWeight: "600",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    width: "85%",
    padding: 20,
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: "#fff",
  },
  modalDesc: {
    textAlign: "center",
    marginVertical: 10,
    color: "#aaa",
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 10,
  },
  cartButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  cartButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  closeButton: {
    marginTop: 8,
  },
  closeButtonText: {
    color: "#777",
  },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    backgroundColor: "#111827",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  cartText: {
    color: "#fff",
    fontSize: 16,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  payText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "600",
  },
  search: {
    backgroundColor: "#111",
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    color: "#fff",
  },
  label: {
    textAlign: "center",
    paddingVertical: 6,
    fontWeight: "600",
    marginBottom: 6,
  },
  success: {
    color: "#10B981",
  },
  error: {
    color: "#EF4444",
  },
  balanceBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 6,
  },
  balanceText: {
    marginLeft: 6,
    fontWeight: "600",
    color: "#fff",
  },
});
