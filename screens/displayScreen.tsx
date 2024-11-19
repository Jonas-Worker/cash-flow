import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
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
import { Calendar } from 'react-native-calendars';

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
  | "balances"
  | "budget"
  | "monthlyBudget"
  | "incomeType"
  | "expensesType";

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

interface MonthlyBudget {
  limit_value: number;
}
const selectedCategoriesExpenses = [
  "Food",
  "Transport",
  "Rent",
  "Play",
  "Health",
  "Transfer",
];
const selectedCategoriesIncome = [
  "Salary",
  "Reward",
  "Gift",
  "Inves",
  "Saving",
  "Other",
  "薪水",
  "礼物",
  "投资",
  "其他",
  "奖励",
  "储蓄",
];
const categoryColors: { [key: string]: string } = {
  Salary: "rgba(255, 255, 255, 0.2)",
  Reward: "rgba(255, 255, 255, 0.3)",
  Gift: "rgba(255, 255, 255, 0.4)",
  Inves: "rgba(255, 255, 255, 0.5)",
  Saving: "rgba(255, 255, 255, 0.6)",
  Other: "rgba(255, 255, 255, 0.7)",
  Food: "rgba(255, 255, 255, 0.1)",
  Transport: "rgba(255, 255, 255, 0.2)",
  Rent: "rgba(255, 255, 255, 0.3)",
  Play: "rgba(255, 255, 255, 0.4)",
  Health: "rgba(255, 255, 255, 0.5)",
  Transfer: "rgba(255, 255, 255, 0.6)",
};
const categoryTagExpenses: { [key: string]: string } = {
  Food: "食品",
  Transport: "交通",
  Rent: "租金",
  Play: "娱乐",
  Health: "健康",
  Transfer: "转帐",
};
const categoryTagEnExpenses: { [key: string]: string } = {
  Food: "Food",
  Transport: "Transport",
  Rent: "Rent",
  Play: "Play",
  Health: "Health",
  Transfer: "Transfer",
};
const categoryTagIncome: { [key: string]: string } = {
  Salary: "薪水",
  Gift: "礼物",
  Inves: "投资",
  Other: "其他",
  Reward: "奖励",
  Saving: "储蓄",
};
const categoryTagEnIncome: { [key: string]: string } = {
  Salary: "Salary",
  Gift: "Gift",
  Inves: "Inves",
  Other: "Other",
  Reward: "Reward",
  Saving: "Saving",
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
  const [monthlyBadget, setMonthlyBadget] = useState<MonthlyBudget[]>([]);
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
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [eventData, setEventData] = useState<string>('');

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

  useEffect(() => {
    const fetchMonthlyBudget = async () => {
      const { data, error } = await supabase
        .from("planning")
        .select("limit_value")
        .eq("email", email);
      if (error) {
        console.error(error);
      } else {
        setMonthlyBadget(data || []);
      }
      setLoading(false);
    };

    fetchMonthlyBudget();
  }, [email]);

  const calculateBudget = () => {
    let budget = 0;
    monthlyBadget.forEach((flow) => {
      if (flow.limit_value) {
        budget += flow.limit_value;
      }
    });
    return budget;
  };

  const calculateExpenses = () => {
    let expenses = 0;
    cashFlows.forEach((flow) => {
      if (flow.cash_out) {
        expenses += flow.cash_out;
      }
    });
    return expenses;
  };

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

  // Pie Chart Data for Income & Expenses
  const budgetMonthly = [
    {
      name: translate("budget"),
      population: calculateBudget(),
      color: filterIncome
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(255, 255, 255, 0.8)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
    {
      name: translate("expenses"),
      population: calculateExpenses(),
      color: filterExpenses
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(255, 255, 255, 0.8)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
  ];

  const remarksCount = filteredCashFlows.reduce((acc, item) => {
    // Normalize both English and Chinese categories to the English name
    const englishCategory =
      Object.keys(categoryTagExpenses).find(
        (key) => categoryTagExpenses[key] === item.category
      ) || item.category;

    // Aggregate count for the category (English name)
    acc[englishCategory] = (acc[englishCategory] || 0) + Number(item.cash_out);

    return acc;
  }, {} as { [key: string]: number });
  const totalCashOut = Object.values(remarksCount).reduce((total, cashOut) => total + cashOut, 0);
  // Function to get the category name based on the language
  const getCategoryTag = (category: string) => {
    if (language === "zh") {
      return categoryTagExpenses[category] || category;
    } else {
      return categoryTagEnExpenses[category] || category;
    }
  };

  const expensesChart = Object.entries(remarksCount)
    .filter(([category, _]) => selectedCategoriesExpenses.includes(category)) // Filter by selected categories
    .map(([category, cashOut]) => {
      const color = categoryColors[category] || "#000000";
      const tag = getCategoryTag(category);


    const percentage = totalCashOut > 0 ? (cashOut / totalCashOut) * 100 : 0;
      return {
        name: tag,
        population: percentage,
        color: color,
        legendFontColor: "#fff",
        legendFontSize: 15,
      };
    });

    const remarksCountIncome = filteredCashFlows.reduce((acc, item) => {
      // Normalize both English and Chinese categories to the English name
      const englishCategory =
        Object.keys(categoryTagIncome).find(
          (key) => categoryTagIncome[key] === item.category
        ) || item.category;
    
      // Aggregate the cash_in values for the category (English name)
      acc[englishCategory] = (acc[englishCategory] || 0) + Number(item.cash_in);
    
      return acc;
    }, {} as { [key: string]: number });

    // Calculate the total sum of cash_in
    const totalCashIn = Object.values(remarksCountIncome).reduce((total, cashIn) => total + cashIn, 0);

  const getCategoryTagIncome = (category: string) => {
    if (language === "zh") {
      return categoryTagIncome[category] || category;
    } else {
      return categoryTagEnIncome[category] || category;
    }
  };

  const incomeChart = Object.entries(remarksCountIncome)
  .filter(([category, _]) => selectedCategoriesIncome.includes(category)) // Filter by selected categories
  .map(([category, cashIn]) => {
    const color = categoryColors[category] || "#000000";
    const tag = getCategoryTagIncome(category);

    // Calculate the percentage
    const percentage = totalCashIn > 0 ? (cashIn / totalCashIn) * 100 : 0;

    return {
      name: tag,
      population: percentage,
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

  const handleDayPress = (day: any) => {
    const date = day.dateString; // Date in 'yyyy-mm-dd' format
    setSelectedDay(date);
  };

  const markedDates = cashFlows.reduce((acc, flow) => {
    const date = flow.created_at; // Assuming flow.date is 'yyyy-mm-dd'
    if (flow.cash_in) {
      acc[date] = {
        marked: true,
        dotColor: 'blue', // Use a dot to mark the date
        customStyles: {
          container: {
            backgroundColor: 'blue',
          },
          text: {
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
          },
        },
      };
    }
    return acc;
  }, {} as any);

  // Adding income as a label below the marked date
  const renderIncomeLabel = (date: string) => {
    const cashFlow = cashFlows.find((flow) => flow.created_at === date);
    if (cashFlow && cashFlow.cash_in) {
      return <Text style={styles.incomeLabel}>${cashFlow.cash_in.toFixed(2)}</Text>;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.displayContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.totalContainer}>
            <View style={styles.totalItem}>
              <Text style={styles.value}>{translate("income")}</Text>
              <Text style={styles.valueNumIncome}>RM {income}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.value}>{translate("expenses")}</Text>
              <Text style={styles.valueNumExpenses}>RM {expenses}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.value}>{translate("balances")}</Text>
              <Text style={styles.valueNumBalances}>
                RM {Math.round(balance * 100) / 100}
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={() => setViewMode("income-expenses")}
              style={[styles.toggleButton]}
            >
              <Icon name="attach-money" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode("remarks")}
              style={[styles.toggleButton]}
            >
              <Icon name="comment" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={showDatePicker}
            >
              <Icon name="calendar-today" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={resetFilter}>
              <Icon name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Pie Chart */}
          <View style={styles.bodyPieChart}>
            <Text style={styles.titlePie}>{translate("incomeType")}</Text>
            <View style={{ position: "relative" }}>
              <PieChart
                data={incomeChart}
                width={Dimensions.get("window").width - 40}
                height={200}
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
                paddingLeft="20"
              />
              <View
                style={{
                  position: "absolute",
                  width: 120,
                  height: 120,
                  backgroundColor: "#000",
                  borderRadius: 100,
                  zIndex: 1,
                  top: 40,
                  left: 55,
                }}
              />
            </View>
          </View>
          <View style={styles.bodyPieChart}>
            <Text style={styles.titlePie}>{translate("expensesType")}</Text>
            <View style={{ position: "relative" }}>
              <PieChart
                data={expensesChart}
                width={Dimensions.get("window").width - 40}
                height={200}
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
                paddingLeft="20"
              />
              <View
                style={{
                  position: "absolute",
                  width: 120,
                  height: 120,
                  backgroundColor: "#000",
                  borderRadius: 100,
                  zIndex: 1,
                  top: 40,
                  left: 55,
                }}
              />
            </View>
          </View>
          <TouchableOpacity>
            <View style={styles.bodyPieChart}>
              <Text style={styles.titlePie}>{translate("monthlyBudget")}</Text>
              <View style={{ position: "relative" }}>
                <PieChart
                  data={budgetMonthly}
                  width={Dimensions.get("window").width - 40}
                  height={200}
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
                  paddingLeft="20"
                />
                <View
                  style={{
                    position: "absolute",
                    width: 120,
                    height: 120,
                    backgroundColor: "#000",
                    borderRadius: 100,
                    zIndex: 1,
                    top: 40,
                    left: 55,
                  }}
                />
              </View>
            </View>
          </TouchableOpacity>
          <View>
          <Calendar
              markedDates={markedDates}
              monthFormat={'yyyy MM'}
              onDayPress={handleDayPress}
              markingType="custom"
            />
            {selectedDay && (
              <View style={styles.eventDetails}>
                <Text style={styles.eventText}>Selected Date: {selectedDay}</Text>
                {renderIncomeLabel(selectedDay)} {/* Show income for selected day */}
              </View>
            )}
          </View>
        </View>

        {/* Date Picker */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  displayContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContainer: {
    padding: 1,
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
  totalItem: {},
  label: {
    fontSize: 14,
    color: "#00796b",
  },
  value: {
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  valueNumIncome: {
    textAlign: "center",
    color: "rgba(124, 252, 0,1)",
    fontWeight: "bold",
  },
  valueNumExpenses: {
    textAlign: "center",
    color: "rgba(255,0,0, 1)",
    fontWeight: "bold",
  },
  valueNumBalances: {
    textAlign: "center",
    color: "rgba(124, 252, 0,1)",
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
    borderColor: "#f8b400",
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
    margin: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  titlePie: {
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    paddingTop: 10,
  },
  eventDetails: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '80%',
    alignItems: 'center',
  },
  eventText: {
    fontSize: 16,
    color: '#333',
  },
  incomeLabel: {
    marginTop: 5,
    fontSize: 12,
    color: 'blue',
    fontWeight: 'bold',
  },
});

export default DisplayScreen;
