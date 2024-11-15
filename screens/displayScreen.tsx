import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  ScrollView
} from "react-native";
import supabase from "../supabaseClient";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import { BarChart } from "react-native-chart-kit";
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
  | "details"
  | "not_record"
  | "balances";

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
  Salary: "rgba(255, 255, 255, 0.15)",
  Freelance: "rgba(255, 255, 255, 0.2)",
  Gift: "rgba(255, 255, 255, 0.3)",
  Inves: "rgba(255, 255, 255, 0.4)",
  Other: "rgba(255, 255, 255, 0.5)",
  Food: "rgba(255, 255, 255, 0.6)",
  Transport: "rgba(255, 255, 255, 0.7)",
  Rent: "rgba(255, 255, 255, 0.8)",
  Play: "rgba(255, 255, 255, 0.9)",
  Health: "rgba(255, 255, 255, 0.95)",
  Study: "rgba(255, 255, 255, 1)",
};
const categoryTag: { [key: string]: string } = {
    Salary: "薪水",
    Gift: "礼物",
    Inves: "投资",
    Other: "其他",
    Food: "食品",
    Transport: "交通",
    Rent: "租金",
    Play: "娱乐",
    Health: "健康",
    Study: "学习",
};
const categoryTagEn: { [key: string]: string } = {
  Salary: "Salary",
  Gift: "Gift",
  Inves: "Inves",
  Other: "Other",
  Food: "Food",
  Transport: "Transport",
  Rent: "Rent",
  Play: "Play",
  Health: "Health",
  Study: "Study",
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
    if (selectedDate) {
      return formatDate(createdAt) === formatDate(selectedDate);
    }
    return true; // If no date is selected, show all data
  });

  const filterIncome = filteredCashFlows.reduce((acc, item) => {
    return item.cash_in ? acc + item.cash_in : acc;
  }, 0);

  const filterExpenses = filteredCashFlows.reduce((acc, item) => {
    return item.cash_out ? acc + item.cash_out : acc;
  }, 0);
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

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // Pie Chart Data for Income & Expenses
  const chartData = [
    {
      name: translate("income"),
      population: filterIncome,
      color: "rgba(255, 255, 255, 0.3)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
    {
      name: translate("expenses"),
      population: filterExpenses,
      color: "rgba(255, 255, 255, 0.5)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
  ];

  const remarksCount = filteredCashFlows.reduce((acc, item) => {
    // Normalize both English and Chinese categories to the English name
    const englishCategory = Object.keys(categoryTag).find(
      (key) => categoryTag[key] === item.category
    ) || item.category;
  
    // Aggregate count for the category (English name)
    acc[englishCategory] = (acc[englishCategory] || 0) + 1;
  
    return acc;
  }, {} as { [key: string]: number });
  
  // Function to get the category name based on the language
  const getCategoryTag = (category: string) => {
    if (language === "zh") {
      return categoryTag[category] || category;
    } else {
      return categoryTagEn[category] || category;
    }
  };
  
  const remarksChartData = Object.entries(remarksCount).map(([category, count]) => {
    const color = categoryColors[category] || "#000000"; 
    const tag = getCategoryTag(category); 
    
    return {
      name: tag,
      population: count,
      color: color,
      legendFontColor: "#fff",
      legendFontSize: 15,
    };
  });
  

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

  const chartDataBar = {
    labels: cashFlows.map((flow) => {
      const date = new Date(flow.created_at);
      return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
    }), // Dates for the x-axis, handling invalid dates
    datasets: [
      {
        data: cashFlows.map((flow) => flow.cash_in || 0), // Amounts for the y-axis, default to 0 if cash_in is missing
      },
    ],
  };
  const chartConfig = {
    backgroundColor: "rgba(0, 0, 0, 0.1 )",
    backgroundGradientFrom: "rgba(0, 0, 0, 0.3 )",
    backgroundGradientTo: "rgba(255, 255, 255, 0.2 )",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726",
    },
  };

  return (
    <View style={styles.displayContainer}>
      <View style={styles.container}>
        <View style={styles.totalContainer}>
          <View style={styles.totalItem}>
          <Text style={styles.value}>{ translate("income")}</Text>
            <Text style={styles.value}>RM {income}</Text>
          </View>
          <View style={styles.totalItem}>
          <Text style={styles.value}>{ translate("expenses")}</Text>
            <Text style={styles.value}>RM {expenses}</Text>
          </View>
          <View style={styles.totalItem}>
          <Text style={styles.value}>{ translate("balances")}</Text>
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
            ]}
          >
            <Icon name="attach-money" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode("remarks")}
            style={[
              styles.toggleButton,
            ]}
          >
            <Icon name="comment" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={showDatePicker}
          >
            <Icon name="calendar-today" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={resetFilter}
          >
            <Icon name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Pie Chart */}
        <View style={styles.bodyPieChart}>
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
       <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Cash Flow Chart</Text>
        <BarChart
          data={chartDataBar}
          width={Dimensions.get("window").width - 40} // Width of the bar chart
          height={220} // Height of the bar chart
          chartConfig={chartConfig}
          verticalLabelRotation={30} // Rotating the labels to fit better
          yAxisLabel="RM" // Label for the y-axis (currency symbol)
          yAxisSuffix=" " // Add any suffix you need (e.g., "USD")
        />
      </ScrollView>
        </View>

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
    backgroundColor: "#000000",
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
    color: "#fff",
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 2,
    borderColor: "rgba(255,255, 255,0.5)",
  },
  toggleButtonText: {
    color: "#ffffff",
    fontSize: 10,
    textAlign: "center",
  },
  notRecord: {
    alignItems: "center",
  },
  bodyPieChart: {
    borderRadius: 20,
    marginHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default DisplayScreen;
