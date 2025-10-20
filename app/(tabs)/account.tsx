

import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAccountLogic } from "../logic/account";

export default function AccountManager() {
  const logic = useAccountLogic();

  if (logic.loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  if (logic.view === "login")
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#888"
          value={logic.name}
          onChangeText={logic.setName}
        />
        <TouchableOpacity style={styles.button} onPress={logic.handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        {logic.label ? <Text style={styles.label}>{logic.label}</Text> : null}
      </View>
    );

  const { profile, transactions, quickTopUps, mobileMoneyProviders } = logic;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{profile?.Name}</Text>
      <Text style={styles.balanceText}>Net: ${profile?.net?.toFixed(2)}</Text>
      <Text
        style={[
          styles.statusText,
          { color: profile?.isFrozen ? "#FF5252" : "#4CAF50" },
        ]}
      >
        {profile?.isFrozen ? "Frozen" : "✅ Active"}
      </Text>

      {/* Personal Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Age: {profile?.age}</Text>
        <Text style={styles.infoText}>BOD: {profile?.bod}</Text>
        <Text style={styles.infoText}>Father: {profile?.father}</Text>
        <Text style={styles.infoText}>Mother: {profile?.mother}</Text>
        <Text style={styles.infoText}>ID No: {profile?.idno}</Text>
        <Text style={styles.infoText}>NIN: {profile?.nin}</Text>
        <Text style={styles.infoText}>Phone: {profile?.phone}</Text>
        <Text style={styles.infoText}>NOK: {profile?.nok}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#FF9800" }]}
          onPress={() => {
            const val = prompt("Enter new net value:") || "0";
            logic.updateNetManually(val);
          }}
        >
          <Text style={styles.actionButtonText}>Manual Update</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: profile?.isFrozen ? "#4CAF50" : "#FF5252" },
          ]}
          onPress={logic.toggleFreeze}
        >
          <Text style={styles.actionButtonText}>
            {profile?.isFrozen ? "Unfreeze" : "Freeze"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top-Up Section */}
      <Text style={styles.sectionTitle}>Top-Up Account</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={logic.topUpAmount}
          onChangeText={logic.setTopUpAmount}
        />

        <View style={styles.quickTopUps}>
          {quickTopUps.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.quickTopUpBtn}
              onPress={() => logic.simulateTopUp(amt, "Manual")}
            >
              <Text style={styles.quickTopUpText}>${amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mmRow}>
          {mobileMoneyProviders.map((provider) => (
            <TouchableOpacity
              key={provider.name}
              style={[styles.mmBtn, { backgroundColor: provider.color }]}
              onPress={() =>
                logic.simulateTopUp(Number(logic.topUpAmount), provider.name)
              }
            >
              <Text style={styles.mmText}>{provider.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() => logic.simulateTopUp(Number(logic.topUpAmount))}
        >
          <Text style={styles.topUpButtonText}>Top-Up Now</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction History */}
      <Text style={styles.sectionTitle}>Transaction History</Text>
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.txCard}>
              <Text style={styles.txText}>To: {item.receiver}</Text>
              <Text style={styles.txText}>Amount: {item.amount}</Text>
              <Text style={styles.txText}>{item.timestamp}</Text>
              <Text style={styles.txText}>Proof: {item.proof}</Text>
              <Text
                style={[
                  styles.txText,
                  { color: item.status === "Completed" ? "#4CAF50" : "#FFD700" },
                ]}
              >
                Status: {item.status}
              </Text>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noTx}>No transactions yet.</Text>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={() => logic.setView("login")}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {logic.label ? <Text style={styles.label}>{logic.label}</Text> : null}
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 15, backgroundColor: "#121212" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 12 },
  balanceText: { fontSize: 20, color: "#fff", marginVertical: 5 },
  statusText: { fontSize: 16, marginBottom: 10 },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: { backgroundColor: "#007bff", padding: 14, borderRadius: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  label: { color: "#ccc", textAlign: "center", marginTop: 10 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 12,
    marginHorizontal: 5,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },
  sectionTitle: { fontSize: 20, color: "#fff", fontWeight: "600", marginVertical: 10 },
  card: { backgroundColor: "#1f1f1f", borderRadius: 15, padding: 15, marginBottom: 15 },
  quickTopUps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  quickTopUpBtn: { backgroundColor: "#333", padding: 10, borderRadius: 10 },
  quickTopUpText: { color: "#fff", fontWeight: "600" },
  mmRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  mmBtn: { flex: 1, marginHorizontal: 3, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  mmText: { color: "#fff", fontWeight: "700" },
  topUpButton: { backgroundColor: "#FF5722", padding: 14, borderRadius: 20, alignItems: "center" },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  txCard: { backgroundColor: "#1a1a1a", borderRadius: 10, padding: 10, marginBottom: 10 },
  txText: { color: "#fff", fontSize: 14 },
  noTx: { color: "#aaa", textAlign: "center", marginVertical: 10 },
  logoutButton: { backgroundColor: "#333", padding: 10, borderRadius: 10, marginTop: 10 },
  logoutText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  infoCard: { backgroundColor: "#1f1f1f", borderRadius: 15, padding: 15, marginBottom: 15 },
  infoText: { color: "#fff", fontSize: 16, marginBottom: 4 },
});
