import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const CreditLoanScreen: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [interest] = useState(10);

  const [balance, setBalance] = useState(0);
  const [loanBalance, setLoanBalance] = useState(0);
  const [monthlyPay, setMonthlyPay] = useState(0);
  const [loanStatus, setLoanStatus] = useState("");

  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const accRef = doc(db, "acc", "elijah");

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const snap = await getDoc(accRef);
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.balance || 0);
          setLoanBalance(data.loan || 0);
          setLoanStatus(data.loanStatus || "");

          if (data.loan && data.loanDuration) {
            setMonthlyPay(data.loan / data.loanDuration);
          }
        } else {
          await setDoc(accRef, {
            balance: 0,
            loan: 0,
            loanStatus: "cleared",
          });
        }
      } catch {
        Alert.alert("Error", "Failed to load account");
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const applyLoan = async () => {
    if (loanStatus === "active") {
      Alert.alert("Loan Active", "You already have an active loan");
      return;
    }

    if (pin.length !== 4) {
      Alert.alert("PIN Required", "Enter your 4-digit PIN");
      return;
    }

    const amount = parseFloat(loanAmount);
    const months = parseInt(duration);

    if (!amount || !months) {
      Alert.alert("Invalid Input", "Enter valid amount and duration");
      return;
    }

    const totalLoan = amount + amount * (interest / 100);
    const monthly = totalLoan / months;

    try {
      setLoading(true);

      await updateDoc(accRef, {
        balance: balance + amount,
        loan: totalLoan,
        loanDuration: months,
        loanInterest: interest,
        loanStatus: "active",
        updatedAt: new Date(),
      });

      setBalance(balance + amount);
      setLoanBalance(totalLoan);
      setMonthlyPay(monthly);
      setLoanStatus("active");

      setLoanAmount("");
      setDuration("");
      setPin("");
      setShowPin(false);

      Alert.alert("Loan Approved", "Loan credited successfully");
    } catch {
      Alert.alert("Error", "Loan processing failed");
    } finally {
      setLoading(false);
    }
  };

  const repayMonthly = async () => {
    if (balance < monthlyPay) {
      Alert.alert("Insufficient Balance", "Top up to repay");
      return;
    }

    const newLoan = loanBalance - monthlyPay;

    try {
      await updateDoc(accRef, {
        balance: balance - monthlyPay,
        loan: newLoan,
        loanStatus: newLoan <= 0 ? "cleared" : "active",
        updatedAt: new Date(),
      });

      setBalance(balance - monthlyPay);
      setLoanBalance(newLoan);

      if (newLoan <= 0) {
        setLoanStatus("cleared");
        Alert.alert("Success", "Loan fully paid");
      } else {
        Alert.alert("Success", "Monthly payment successful");
      }
    } catch {
      Alert.alert("Error", "Repayment failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Credit & Loan Service</Text>

      <View style={styles.card}>
        <Text style={styles.balance}>Current Balance</Text>
        <Text style={styles.balanceAmount}>UGX {balance.toFixed(0)}</Text>
      </View>

      {loanStatus === "active" && (
        <View style={styles.card}>
          <Text style={styles.subTitle}>Active Loan</Text>
          <Text>Loan Balance: UGX {loanBalance.toFixed(0)}</Text>
          <Text>Monthly Pay: UGX {monthlyPay.toFixed(0)}</Text>

          <TouchableOpacity style={styles.button} onPress={repayMonthly}>
            <Text style={styles.buttonText}>Pay Monthly Installment</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Loan Amount (UGX)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={loanAmount}
          onChangeText={setLoanAmount}
          placeholder="500000"
        />

        <Text style={styles.label}>Duration (Months)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
          placeholder="6"
        />

        <Text style={styles.label}>Interest Rate</Text>
        <Text style={styles.interest}>{interest}%</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowPin(true)}
        >
          <Text style={styles.buttonText}>Apply Loan</Text>
        </TouchableOpacity>
      </View>

      {showPin && (
        <View style={styles.pinCard}>
          <Text style={styles.label}>Enter PIN</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
            value={pin}
            onChangeText={setPin}
          />

          <TouchableOpacity style={styles.button} onPress={applyLoan}>
            <Text style={styles.buttonText}>Confirm Loan</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default CreditLoanScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f6fa",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  balance: {
    fontSize: 14,
    color: "#555",
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 6,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  interest: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2ecc71",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  pinCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
  },
});
