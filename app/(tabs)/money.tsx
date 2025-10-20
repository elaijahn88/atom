// src/screens/CreditSavingsServices.tsx
import React from "react";
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreditSavingsLogic } from "../logic/creditSavingsLogic";

export default function CreditSavingsServices() {
  const logic = useCreditSavingsLogic();
  const isDark = true; // Or use useColorScheme()

  if (logic.loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ color: "#ccc", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f9f9f9" }]}>
      <Text style={[styles.header, { color: isDark ? "#fff" : "#000" }]}>Credit & Savings Services</Text>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
        <Text style={[styles.serviceName, { color: isDark ? "#fff" : "#000" }]}>{logic.profile?.Name}</Text>
        <Text style={[styles.serviceDesc, { color: isDark ? "#aaa" : "#555" }]}>Phone: {logic.profile?.phone}</Text>
        <Text style={[styles.serviceBalance, { color: "#00a650" }]}>
          Balance: ${Number(logic.profile?.net || 0).toFixed(2)}
        </Text>
        <Text style={{ color: logic.profile?.isFrozen ? "#FF5252" : "#4CAF50", marginTop: 6 }}>
          {logic.profile?.isFrozen ? "Frozen" : "Active"}
        </Text>
        <TouchableOpacity style={[styles.payBtn, { marginTop: 10 }]} onPress={logic.toggleFreeze}>
          <Text style={styles.payBtnText}>{logic.profile?.isFrozen ? "Unfreeze" : "Freeze"}</Text>
        </TouchableOpacity>
      </View>

      {/* Create Service Button */}
      <TouchableOpacity style={styles.createBtn} onPress={() => logic.setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createBtnText}>Create New Service</Text>
      </TouchableOpacity>

      {/* Services List */}
      <FlatList
        data={logic.services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <View style={[styles.serviceCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.serviceName, { color: isDark ? "#fff" : "#000" }]}>{item.name}</Text>
            <Text style={[styles.serviceDesc, { color: isDark ? "#aaa" : "#555" }]}>{item.description}</Text>
            <Text style={[styles.serviceBalance, { color: "#00a650" }]}>Balance: ${item.balance.toFixed(2)}</Text>
            <TouchableOpacity style={styles.payBtn} onPress={() => logic.setSelectedService(item)}>
              <Text style={styles.payBtnText}>Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Transaction History */}
      <Text style={[styles.sectionHeader, { color: isDark ? "#fff" : "#000" }]}>Transaction History</Text>
      <FlatList
        data={logic.transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[styles.transactionCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={{ color: isDark ? "#fff" : "#000", fontWeight: "700" }}>
              {item.type === "credit" ? `Paid $${item.amount}` : `${item.type} $${item.amount}`}
            </Text>
            <Text style={{ color: "#888", fontSize: 12 }}>{new Date(item.timestamp).toLocaleString()}</Text>
            {item.note ? <Text style={{ color: "#aaa", marginTop: 6 }}>{item.note}</Text> : null}
          </View>
        )}
      />

      {/* Modals for Create Service & Payment */}
      {/* ...reuse logic.modalVisible, logic.selectedService, etc. as in original UI... */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 36, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  createBtn: { flexDirection: "row", backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  createBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  serviceCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  serviceName: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  serviceDesc: { fontSize: 14, marginBottom: 8 },
  serviceBalance: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  payBtn: { backgroundColor: "#007aff", padding: 10, borderRadius: 12, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700" },
  sectionHeader: { fontSize: 20, fontWeight: "800", marginVertical: 10 },
  transactionCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  profileCard: { padding: 14, borderRadius: 12, marginBottom: 12 },
});
