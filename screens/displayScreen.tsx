import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
} from "react-native";
import supabase from "../supabaseClient";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import Modal from "react-native-modal";
import { useFocusEffect } from "@react-navigation/native";
// Define the structure of the translations
type Language = "en" | "zh";
type TranslationKeys =
  | "salary"
  | "gift"
  | "inves"
  | "other"
  | "food"
  | "transport"
  | "rent"
  | "play"
  | "health"
  | "study"
  | "income"
  | "expenses"
  | "category"
  | "remark"
  | "date"
  | "overview"
  | "reset"
  | "details";
// Format the Date object into DD/MM/YY format
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
  return `${day}/${month}/${year}`;
};

interface CashFlow {
  id: number;
  cash_in: number;
  cash_out: number;
  created_at: string;
  remark: string;
  category: string;
}

const categoryColors: { [key: string]: string } = {
  Salary: "#4CAF50" ,
  Freelance: "#FF9800",
  Gift: "#FF5722",
  Inves: "#2196F3",
  Other: "#9E9E9E",
  Food: "#FFEB3B",
  Transport: "#795548",
  Rent: "#9C27B0",
  Play: "#E91E63",
  Health: "#00BCD4",
  Study: "#673AB7",
};


type RootParamList = {
  MainPage: { email: string };
  Profile: { email: string };
  Record: { email: string };
  Insert: { email: string };
  Settings: undefined;
};

const DisplayScreen: React.FC = () => {
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"income-expenses" | "remarks">(
    "income-expenses"
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const route = useRoute<RouteProp<RootParamList, "Record">>();
  const email = route.params?.email || "No email provided";
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [balance, setBalance] = useState(0);


  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage) {
        setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.error("Failed to load language from AsyncStorage", error);
    }
  };
  useEffect(() => {
    loadLanguage();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadLanguage();
    }, [])
  );

  const translate = (key: TranslationKeys): string => {
    return translations[language][key] || key;
  };
  
  useEffect(() => {
    const fetchCashFlows = async () => {
      const { data, error } = await supabase
        .from("cash_flows")
        .select("*")
        .eq("email", email);
      if (error) {
        console.error(error);
      } else {
        setCashFlows(data || []);
      }
      setLoading(false);
    };

    fetchCashFlows();
  }, [email]);

  // Filter data based on selected date
  const filteredCashFlows = cashFlows.filter((item) => {
    const createdAt = new Date(item.created_at);
    let filterIncome = 0
    if (selectedDate) {
      
      return formatDate(createdAt) === formatDate(selectedDate);
    }
    return true; // If no date is selected, show all data
  });
  // Calculate balances
  const calculateTotals = () => {
    let totalIncome = 0;
    let totalExpenses = 0;
    cashFlows.forEach((item) => {
      totalIncome += item.cash_in;
      totalExpenses += item.cash_out;
    });
    setIncome(Number(totalIncome.toFixed(2)));
    setExpenses(Number(totalExpenses.toFixed(2)));
    setBalance(Number((totalIncome - totalExpenses).toFixed(2)));
  };

  useEffect(() => {
    calculateTotals();
  }, [cashFlows]);

  const renderItem = ({ item }: { item: CashFlow }) => (
    <View style={styles.item}>
      {item.cash_in !== 0 ? (
        <>
          <Text style={styles.text}>{translate("income")}: {item.cash_in}</Text>
          <Text style={styles.text}>{translate("category")}: {item.category}</Text>
          <Text style={styles.text}>{translate("remark")}: {item.remark}</Text>
          <Text style={styles.text}>{translate("date")}: {item.created_at}</Text>
        </>
      ) : item.cash_out ? (
        <>
          <Text style={styles.text}>{translate("expenses")}: {item.cash_out}</Text>
          <Text style={styles.text}>{translate("category")}: {item.category}</Text>
          <Text style={styles.text}>{translate("remark")}: {item.remark}</Text>
          <Text style={styles.text}>{translate("date")}: {item.created_at}</Text>
        </>
      ) : null}
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // Pie Chart Data for Income & Expenses
  const chartData = [
    {
      name: translate("income"),
      population: income,
      color: "rgba(50, 205, 50, 1)",
      legendFontColor: "#000000",
      legendFontSize: 15,
    },
    {
      name: translate("expenses"),
      population: expenses,
      color: "rgba(255, 99, 71, 1)",
      legendFontColor: "#000000",
      legendFontSize: 15,
    },
  ];

  const remarksCount = filteredCashFlows.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const remarksChartData = Object.entries(remarksCount).map(
    ([remark, count]) => {
      const color = categoryColors[remark] || "#000000";
      return {
        name: remark,
        population: count,
        color: color,
        legendFontColor: "#000000",
        legendFontSize: 15,
      };
    }
  );

  const showDatePicker = () => {
    setDatePickerVisible(true);
  };
  const handleDateConfirm = (date: Date) => {
    setSelectedDate(date);
    setDatePickerVisible(false);
  };

  const handleDateCancel = () => {
    setDatePickerVisible(false);
  };

  const resetFilter = () => {
    setDatePickerVisible(false);
    setSelectedDate(null);
    setViewMode("income-expenses");
  };

 

  return (
    <View style={styles.displayContainer}>
      <View style={styles.container}>
        <View style={styles.totalContainer}>
          <View style={styles.totalItem}>
            <Icon name="attach-money" size={24} color="#00796b" />
            <Text style={styles.value}>RM {income}</Text>
          </View>
          <View style={styles.totalItem}>
            <Icon name="payment" size={24} color="#00796b" />
            <Text style={styles.value}>RM {expenses}</Text>
          </View>
          <View style={styles.totalItem}>
            <Icon name="account-balance-wallet" size={24} color="#00796b" />
            <Text style={styles.value}>
              RM {Math.round(balance * 100) / 100}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => setViewMode("income-expenses")}
            style={[
              styles.toggleButton,
              {
                backgroundColor:
                  viewMode === "income-expenses" ? "#00796b" : "#607d8b",
              },
            ]}
          >
            <Text style={styles.toggleButtonText}>{translate("overview")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode("remarks")}
            style={[
              styles.toggleButton,
              {
                backgroundColor: viewMode === "remarks" ? "#00796b" : "#607d8b",
              },
            ]}
          >
            <Text style={styles.toggleButtonText}>{translate("category")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: "#4CAF50" }]}
            onPress={showDatePicker}
          >
            <Text style={styles.toggleButtonText}>
              {selectedDate ? formatDate(selectedDate) : translate("date")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: "#FF5722" }]}
            onPress={resetFilter}
          >
            <Text style={styles.toggleButtonText}>{translate("reset")}</Text>
          </TouchableOpacity>
        </View>

        {/* Pie Chart */}
        <PieChart
          data={viewMode === "income-expenses" ? chartData : remarksChartData}
          width={Dimensions.get("window").width - 40}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
        />

        {/* FlatList for displaying individual records */}
        <Text style={styles.detailsText}>{translate("details")}:</Text>
        <FlatList
          data={filteredCashFlows}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
        />
      </View>

      {/* Date Picker */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  displayContainer: {
    flex: 1,
    backgroundColor: "#fce9db",
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  item: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    marginBottom: 20,
  },
  totalItem: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: 14,
    color: "#00796b",
  },
  value: {
    fontSize: 18,
    color: "#00796b",
    fontWeight: "bold",
  },
  detailsText: {
    textAlign: "center",
    fontSize: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    marginHorizontal: 10,
  },
  toggleButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  toggleButtonText: {
    color: "#ffffff",
    fontSize: 10,
    textAlign: "center",
  },
});

export default DisplayScreen;
