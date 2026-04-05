import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, TextInput, Alert
} from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import {
  loginOrSignup,
  updateWallet,
  updateUserProfile,
  getUserByDeviceId,
  saveDeviceIdForUser,
  addTransaction
} from "../lib/fire";

// ================= TYPES =================
type ScreenType =
  | "home"
  | "send"
  | "history"
  | "withdraw"
  | "deposit"
  | "agentDashboard"
  | "agentTransactions"
  | "agentFund"
  | "agentStats";

// ================= APP =================
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(200000);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeScreen, setActiveScreen] = useState<ScreenType>("home");

  const [receiverPhone, setReceiverPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [pin, setPin] = useState("");
  const [savedPin] = useState("1234");

  const [agentNumber, setAgentNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");

  const [depositAgent, setDepositAgent] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPin, setDepositPin] = useState("");

  const [agentPhone, setAgentPhone] = useState("");
  const [fundAmount, setFundAmount] = useState("");

  const [receipt, setReceipt] = useState<any>(null);

  const deviceId = useMemo(() => Device.modelName || "device-id", []);

  const isSuperAgent = user?.isSuperAgent === true;

  // ================= INIT =================
  useEffect(() => {
    const init = async () => {
      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setUser(u);
        setWalletBalance(u.wallet || 200000);
        setTransactions(u.transactions || []);
      }
    };
    init();
  }, []);

  // ================= AUTO REFRESH =================
  useEffect(() => {
    const i = setInterval(async () => {
      if (!user) return;
      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setWalletBalance(u.wallet || 0);
        setTransactions(u.transactions || []);
      }
    }, 5000);

    return () => clearInterval(i);
  }, [user]);

  // ================= LOGIN =================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerPush = async (uid: string) => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await updateUserProfile(uid, { pushToken: token });
  };

  const handleLogin = async () => {
    const res = await loginOrSignup(email, password, "", deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      await registerPush(res.uid);
      setUser({ uid: res.uid });
    }
  };

  const findUser = async (phone: string) => {
    return await getUserByDeviceId(phone); // replace with phone query later
  };

  // ================= SEND =================
  const handleSend = async () => {
    const amount = parseFloat(sendAmount);

    if (!receiverPhone || isNaN(amount)) return Alert.alert("Invalid");
    if (pin !== savedPin) return Alert.alert("Wrong PIN");
    if (amount > walletBalance) return Alert.alert("No balance");

    const receiver = await findUser(receiverPhone);
    if (!receiver) return Alert.alert("User not found");

    const newBalance = walletBalance - amount;
    await updateWallet(user.uid, newBalance);
    setWalletBalance(newBalance);

    await updateWallet(receiver.uid, (receiver.wallet || 0) + amount);

    const tx = { type: "send", amount, to: receiverPhone, date: new Date().toISOString() };
    await addTransaction(user.uid, tx);
    setTransactions(prev => [tx, ...prev]);

    if (receiver.pushToken) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: receiver.pushToken,
          title: "Money Received",
          body: `UGX ${amount} received`
        })
      });
    }

    setReceipt({ type: "Send", amount, to: receiverPhone });
    setReceiverPhone(""); setSendAmount(""); setPin("");
  };

  // ================= WITHDRAW =================
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);

    if (withdrawPin !== savedPin) return Alert.alert("Wrong PIN");

    const agent = await findUser(agentNumber);
    if (!agent || !agent.isAgent) return Alert.alert("Invalid agent");

    if (amount > walletBalance) return Alert.alert("No balance");

    await updateWallet(user.uid, walletBalance - amount);
    await updateWallet(agent.uid, (agent.wallet || 0) + amount);

    const tx = { type: "withdraw", amount, agent: agentNumber, date: new Date().toISOString() };
    await addTransaction(user.uid, tx);
    setTransactions(prev => [tx, ...prev]);

    setReceipt({ type: "Withdraw", amount, to: agentNumber });

    setAgentNumber(""); setWithdrawAmount(""); setWithdrawPin("");
  };

  // ================= DEPOSIT =================
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);

    if (depositPin !== savedPin) return Alert.alert("Wrong PIN");

    const agent = await findUser(depositAgent);
    if (!agent || !agent.isAgent) return Alert.alert("Invalid agent");

    if ((agent.wallet || 0) < amount) return Alert.alert("Agent no float");

    await updateWallet(user.uid, walletBalance + amount);
    await updateWallet(agent.uid, agent.wallet - amount);

    const tx = { type: "deposit", amount, agent: depositAgent, date: new Date().toISOString() };
    await addTransaction(user.uid, tx);
    setTransactions(prev => [tx, ...prev]);

    setReceipt({ type: "Deposit", amount, to: depositAgent });

    setDepositAgent(""); setDepositAmount(""); setDepositPin("");
  };

  // ================= FUND AGENT =================
  const handleFundAgent = async () => {
    const amount = parseFloat(fundAmount);
    const agent = await findUser(agentPhone);

    if (!agent || !agent.isAgent) return Alert.alert("Invalid agent");

    await updateWallet(user.uid, walletBalance - amount);
    await updateWallet(agent.uid, (agent.wallet || 0) + amount);

    Alert.alert("Funded");
  };

  // ================= UI SCREENS =================
  const renderHome = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>UGX {walletBalance}</Text>

      <TouchableOpacity onPress={() => setActiveScreen("send")} style={styles.btn}><Text>Send</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setActiveScreen("deposit")} style={styles.btn}><Text>Deposit</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setActiveScreen("withdraw")} style={styles.btn}><Text>Withdraw</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setActiveScreen("history")} style={styles.btn}><Text>History</Text></TouchableOpacity>

      {isSuperAgent && (
        <TouchableOpacity onPress={() => setActiveScreen("agentDashboard")} style={styles.btn}>
          <Text>Agent Dashboard</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSend = () => (
    <View style={styles.screen}>
      <TextInput style={styles.input} placeholder="Phone" value={receiverPhone} onChangeText={setReceiverPhone}/>
      <TextInput style={styles.input} placeholder="Amount" value={sendAmount} onChangeText={setSendAmount}/>
      <TextInput style={styles.input} placeholder="PIN" secureTextEntry value={pin} onChangeText={setPin}/>
      <TouchableOpacity style={styles.btn} onPress={handleSend}><Text>Send</Text></TouchableOpacity>
    </View>
  );

  const renderHistory = () => (
    <ScrollView style={styles.screen}>
      {transactions.map((t, i) => (
        <View key={i} style={styles.card}>
          <Text>{t.type}</Text>
          <Text>{t.amount}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderWithdraw = () => (
    <View style={styles.screen}>
      <TextInput style={styles.input} placeholder="Agent" value={agentNumber} onChangeText={setAgentNumber}/>
      <TextInput style={styles.input} placeholder="Amount" value={withdrawAmount} onChangeText={setWithdrawAmount}/>
      <TextInput style={styles.input} placeholder="PIN" secureTextEntry value={withdrawPin} onChangeText={setWithdrawPin}/>
      <TouchableOpacity style={styles.btn} onPress={handleWithdraw}><Text>Withdraw</Text></TouchableOpacity>
    </View>
  );

  const renderDeposit = () => (
    <View style={styles.screen}>
      <TextInput style={styles.input} placeholder="Agent" value={depositAgent} onChangeText={setDepositAgent}/>
      <TextInput style={styles.input} placeholder="Amount" value={depositAmount} onChangeText={setDepositAmount}/>
      <TextInput style={styles.input} placeholder="PIN" secureTextEntry value={depositPin} onChangeText={setDepositPin}/>
      <TouchableOpacity style={styles.btn} onPress={handleDeposit}><Text>Deposit</Text></TouchableOpacity>
    </View>
  );

  const renderAgentDashboard = () => (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.btn} onPress={() => setActiveScreen("agentTransactions")}><Text>Transactions</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => setActiveScreen("agentFund")}><Text>Fund Agent</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => setActiveScreen("agentStats")}><Text>Stats</Text></TouchableOpacity>
    </View>
  );

  const renderAgentTransactions = () => renderHistory();

  const renderAgentFund = () => (
    <View style={styles.screen}>
      <TextInput style={styles.input} placeholder="Agent Phone" value={agentPhone} onChangeText={setAgentPhone}/>
      <TextInput style={styles.input} placeholder="Amount" value={fundAmount} onChangeText={setFundAmount}/>
      <TouchableOpacity style={styles.btn} onPress={handleFundAgent}><Text>Fund</Text></TouchableOpacity>
    </View>
  );

  const renderAgentStats = () => (
    <View style={styles.screen}>
      <Text>Total TX: {transactions.length}</Text>
      <Text>Total Volume: {transactions.reduce((s, t) => s + (t.amount || 0), 0)}</Text>
    </View>
  );

  // ================= MAIN =================
  if (!user) {
    return (
      <View style={styles.screen}>
        <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail}/>
        <TextInput style={styles.input} placeholder="Password" secureTextEntry onChangeText={setPassword}/>
        <TouchableOpacity style={styles.btn} onPress={handleLogin}><Text>Login</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {activeScreen === "home" && renderHome()}
      {activeScreen === "send" && renderSend()}
      {activeScreen === "history" && renderHistory()}
      {activeScreen === "withdraw" && renderWithdraw()}
      {activeScreen === "deposit" && renderDeposit()}
      {activeScreen === "agentDashboard" && renderAgentDashboard()}
      {activeScreen === "agentTransactions" && renderAgentTransactions()}
      {activeScreen === "agentFund" && renderAgentFund()}
      {activeScreen === "agentStats" && renderAgentStats()}

      {receipt && (
        <View style={styles.receipt}>
          <Text>{receipt.type}</Text>
          <Text>UGX {receipt.amount}</Text>
          <Text>{receipt.to}</Text>
          <TouchableOpacity onPress={() => setReceipt(null)}><Text>Close</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: "#FFCC00" },
  input: { backgroundColor: "#fff", padding: 10, marginVertical: 8 },
  btn: { backgroundColor: "#000", padding: 15, marginVertical: 5 },
  card: { backgroundColor: "#fff", padding: 10, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold" },
  receipt: { position: "absolute", top: 100, left: 20, right: 20, backgroundColor: "#fff", padding: 20 }
});
