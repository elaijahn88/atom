// MarketPlace.tsx – Marketplace with quantity selector

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

// ============================
// TYPES
// ============================

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sellerName: string;
}

type CartItem = Product & { quantity: number };

// ============================
// SAMPLE DATA
// ============================

const CATEGORIES = ["shoes", "phones", "gadgets", "others"];
const SELLERS = ["Nike Store", "Apple Store", "Samsung Store", "Tech Store", "Puma Store", "Sound Store", "Google Store"];
const PRODUCT_NAMES = ["Air", "Boost", "Galaxy", "iPhone", "Pixel", "Headphones", "Laptop", "Tablet", "Sneakers", "Buds"];

// Images by category
const CATEGORY_IMAGES: { [key: string]: string[] } = {
  shoes: ["https://picsum.photos/200/200?shoe1", "https://picsum.photos/200/200?shoe2", "https://picsum.photos/200/200?shoe3"],
  phones: ["https://picsum.photos/200/200?phone1", "https://picsum.photos/200/200?phone2", "https://picsum.photos/200/200?phone3"],
  gadgets: ["https://picsum.photos/200/200?gadget1", "https://picsum.photos/200/200?gadget2", "https://picsum.photos/200/200?gadget3"],
  others: ["https://picsum.photos/200/200?other1", "https://picsum.photos/200/200?other2", "https://picsum.photos/200/200?other3"],
};

// Generate random product with category-based image
const generateProduct = (id: number): Product => {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const name = `${category.charAt(0).toUpperCase() + category.slice(1)} ${PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)]}`;
  const sellerName = SELLERS[Math.floor(Math.random() * SELLERS.length)];
  const price = Math.floor(Math.random() * 4000000) + 50000; // 50k to 4M
  const imagePool = CATEGORY_IMAGES[category];
  const image = imagePool[Math.floor(Math.random() * imagePool.length)];
  return { id: id.toString(), name, price, category, sellerName, image };
};

// ============================
// MAIN COMPONENT
// ============================

export default function Marketplace() {
  const PAGE_SIZE = 6;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState(5000000);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextId, setNextId] = useState(1);

  // Load initial products
  useEffect(() => {
    loadMoreProducts(true);
  }, []);

  // ============================
  // FILTERED PRODUCTS
  // ============================

  const filteredProducts = products.filter((p) => {
    const matchCategory = category ? p.category === category : true;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // ============================
  // LOAD MORE PRODUCTS
  // ============================

  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const newProducts: Product[] = [];
      for (let i = 0; i < PAGE_SIZE; i++) {
        const id = nextId + i;
        newProducts.push(generateProduct(id));
      }
      setNextId(nextId + PAGE_SIZE);

      setProducts(reset ? newProducts : [...products, ...newProducts]);
      setLoadingMore(false);
    }, 400); // simulate network delay
  };

  // Reset products when category or search changes
  useEffect(() => {
    loadMoreProducts(true);
  }, [category, search]);

  // ============================
  // CART HANDLERS
  // ============================

  const addToCart = (item: Product, quantity: number) => {
    if (quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + quantity } : c));
      return [...prev, { ...item, quantity }];
    });
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const checkout = () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (wallet < total) return alert("Insufficient wallet balance");

    setWallet(wallet - total);
    setCart([]);
    alert("Checkout successful!");
  };

  // ============================
  // MAIN UI
  // ============================

  return (
    <View style={styles.container}>
      <Text style={styles.wallet}>Wallet: UGX {wallet}</Text>

      <TextInput
        placeholder="Search products..."
        placeholderTextColor="#888"
        style={styles.input}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(category === cat ? null : cat)}
            style={[styles.tab, category === cat && styles.activeTab]}
          >
            <Text style={{ color: category === cat ? "#fff" : "#aaa" }}>{cat.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} addToCart={addToCart} />}
        onEndReached={() => loadMoreProducts(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#fff" /> : null}
        ListEmptyComponent={<Text style={{ color: "#fff", textAlign: "center", marginTop: 20 }}>No products found</Text>}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkout} onPress={checkout}>
          <Text style={{ color: "#fff" }}>Checkout UGX {total}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================
// PRODUCT CARD WITH QUANTITY
// ============================

const ProductCard = ({ item, addToCart }: any) => {
  const fade = new Animated.Value(0);
  const [quantity, setQuantity] = useState(1);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={1}>
      <Animated.Image
        source={{ uri: item.image }}
        style={{ width: "100%", height: 180, opacity: fade }}
        resizeMode="cover"
        onLoad={() => Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()}
      />
      <View style={{ padding: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>UGX {item.price}</Text>
        <Text style={styles.seller}>🏪 {item.sellerName}</Text>

        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
          >
            <Text style={styles.qtyText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyNumber}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => setQuantity((q) => q + 1)}
          >
            <Text style={styles.qtyText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item, quantity)}>
            <Text style={{ color: "#fff" }}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================
// STYLES
// ============================

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#121212" },
  wallet: { color: "#32CD32", fontSize: 16, marginBottom: 10 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  tab: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#555" },
  activeTab: { backgroundColor: "#FF6347", borderColor: "#FF6347" },
  card: { backgroundColor: "#1E1E1E", marginBottom: 15, borderRadius: 14, overflow: "hidden" },
  name: { color: "#fff", fontSize: 16 },
  price: { color: "#2ecc71", fontSize: 15 },
  seller: { color: "#aaa", fontSize: 12 },
  checkout: { backgroundColor: "#e74c3c", padding: 15, alignItems: "center", borderRadius: 8, marginTop: 10 },
  quantityContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  qtyButton: { padding: 8, backgroundColor: "#333", borderRadius: 5 },
  qtyText: { color: "#fff", fontSize: 16 },
  qtyNumber: { color: "#fff", marginHorizontal: 10, fontSize: 16 },
  addButton: { marginLeft: 10, backgroundColor: "#FF6347", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 5 },
});
