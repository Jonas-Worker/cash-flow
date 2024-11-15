import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  Alert,
  SectionList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import supabase from "../supabaseClient";
import { PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

type Language = "en" | "zh";
type TranslationKeys =
  | "welcomeUser"
  | "profile"
  | "displayRecord"
  | "cashFlow"
  | "settings"
  | "income"
  | "expenses";

type RootParamList = {
  MainPage: { email: string };
  Profile: { email: string };
  Record: { email: string };
  Insert: { email: string };
  Settings: { email: string };
};

type NavigationProp = {
  navigate: (screen: keyof RootParamList, params?: any) => void;
};

interface Data {
  id: number;
  cash_in: number;
  cash_out: number;
  created_at: string;
  category: string;
  remark: string;
}

interface SectionData {
  title: string;
  data: Data[];
}

const MainPage = () => {
  const [displayData, setDisplayData] = useState<Data[]>([]);
  const [selectedItem, setSelectedItem] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [emails, setEmail] = useState<string>("");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [viewMode, setViewMode] = useState<"income-expenses" | "remarks">(
    "income-expenses"
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootParamList, "MainPage">>();
  const email = route.params?.email || "No email provided";
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];
  const [displayDate, setDisplayDate] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("email").then((storedEmail) => {
      if (storedEmail) setEmail(storedEmail);
    });
  }, []);

  const groupDataByDate = (data: Data[]) => {
    return data.reduce((acc: any, item: Data) => {
      const date = item.created_at.split("T")[0]; // Extract the date part (YYYY-MM-DD)
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {});
  };

  const handleSaveLimit = async () => {
    try {
      // Step 1: Check if the email already exists in the table
      const { data: existingData, error: fetchError } = await supabase
        .from("daily_expenses")
        .select("*")
        .eq("email", email);

      if (fetchError && fetchError.code !== "PGRST116") {
        // Handle fetch error if it's not a "not found" error
        Alert.alert("Error", "An error occurred while checking the email.");
        return;
      }

      let operationError;
      if (existingData && existingData.length > 0) {
        // Check if the array is not empty
        // Step 2: If the email exists, update the existing record
        const { error: updateError } = await supabase
          .from("daily_expenses")
          .update({ limit_value: dailyLimit })
          .eq("email", email);

        operationError = updateError;
      } else {
        // Step 3: If the email does not exist, insert a new record
        const { error: insertError } = await supabase
          .from("daily_expenses")
          .insert([
            {
              email: email,
              limit_value: dailyLimit,
            },
          ]);

        operationError = insertError;
      }

      // Handle any errors that occurred during the update or insert
      if (operationError) {
        Alert.alert("Error", "Failed to update or insert. Please try again.");
      } else {
        Alert.alert("Success", "Daily limit has been set up.");
        setModalVisible(false);
        setDailyLimit("");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while submitting the data.");
    }
  };
  const checkCashOutLimit = async () => {
    try {
      //  Fetch the limit value from the daily_expenses table
      const { data: limitData, error: limitError } = await supabase
        .from("daily_expenses")
        .select("limit_value, notification, date")
        .eq("email", email);

      if (limitError || !limitData) {
        Alert.alert("Error", "Failed to retrieve the daily limit.");
        return;
      }

      const dailyLimit = limitData[0].limit_value;
      const notified = limitData[0].notification;
      const lastNotificationDate = limitData[0].date;

      //  Check if it's a new day and reset the notified flag
      const currentDate = new Date().toISOString().split("T")[0]; // Format the date to YYYY-MM-DD
      if (currentDate !== lastNotificationDate) {
        // If it's a new day, reset the notified flag
        const { error: resetError } = await supabase
          .from("daily_expenses")
          .update({ notification: false, date: currentDate }) // Update the date as well
          .eq("email", email);

        if (resetError) {
          console.error("Failed to reset notified flag:", resetError);
        }
      }
      if (notified && currentDate === lastNotificationDate) {
        return;
      }

      // Fetch the total cash_out from the cash_flows table for today
      const { data: cashOutData, error: cashOutError } = await supabase
        .from("cash_flows")
        .select("daily_expenses")
        .eq("email", email)
        .eq("created_at", currentDate); // Filter by today's date

      if (cashOutError) {
        Alert.alert("Error", "Failed to retrieve cash out data.");
        return;
      }

      // Calculate the total cash_out for today
      const totalCashOut = cashOutData.reduce(
        (total, record) => total + record.daily_expenses,
        0
      );

      // Compare the total cash_out with the daily limit
      if (totalCashOut > dailyLimit && !notified) {
        //  Send a notification if the limit is exceeded and the user hasn't been notified today
        Alert.alert("Notice", "You have exceeded your daily cash out limit!");

        // Mark the user as notified today
        const { error: updateError } = await supabase
          .from("daily_expenses")
          .update({ notification: true })
          .eq("email", email)
          .eq("date", currentDate);

        if (updateError) {
          Alert.alert("Error", "Failed to mark notification as acknowledged.");
        }
      } else {
        Alert.alert("Warning", "You are within your daily limit.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        "An error occurred while checking the cash out limit."
      );
    }
  };

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
    fetchDisplayData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadLanguage();
      fetchDisplayData();
    }, [])
  );

  const translate = (key: TranslationKeys): string => {
    return translations[language][key] || key;
  };

  const fetchDisplayData = async () => {
    const { data, error } = await supabase
      .from("cash_flows")
      .select("*")
      .eq("email", email);
    if (error) {
      console.error(error);
    } else {
      setDisplayData(data || []);
    }
    setLoading(false);
  };

  const calculateTotals = () => {
    let totalIncome = 0;
    let totalExpenses = 0;
    displayData.forEach((item) => {
      totalIncome += item.cash_in;
      totalExpenses += item.cash_out;
    });
    setIncome(Number(totalIncome.toFixed(2)));
    setExpenses(Number(totalExpenses.toFixed(2)));
    setBalance(Number((totalIncome - totalExpenses).toFixed(2)));
  };

  useEffect(() => {
    calculateTotals();
  }, [displayData]);

  const toggleModal = (item: Data) => {
    setSelectedItem(item);
    setDetailsVisible(true);
  };

  const closeModal = () => {
    setDetailsVisible(false);
  };

  const groupByDate = (data: Data[]): { [key: string]: Data[] } => {
    const groupedData = data.reduce<{ [key: string]: Data[] }>(
      (result, item) => {
        const date = new Date(item.created_at);
        const formattedDate = date.toISOString().split('T')[0]; // Using ISO format (YYYY-MM-DD)
  
        // If the formattedDate doesn't exist in the result object, create an empty array
        if (!result[formattedDate]) {
          result[formattedDate] = [];
        }
  
        // Push the item to the respective date group
        result[formattedDate].push(item);
  
        return result;
      },
      {}
    );
  
    return groupedData;
  };
  // 获取最近7天的数据
  const getLast7DaysData = (data: Data[]): Data[] => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7); // 获取七天前的日期

    return data.filter((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= sevenDaysAgo && itemDate <= today;
    });
  };

  

  const renderItem = ({ item }: { item: Data }) => {
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString();
    return (
      <TouchableOpacity style={styles.item} onPress={() => toggleModal(item)}>
        {item.cash_in !== 0 ? (
          <>
            <Text style={styles.text}>Income: RM {item.cash_in}</Text>
            <Text style={styles.text}>Category: {item.category}</Text>
            <Text style={styles.text}>Date: {item.created_at}</Text>
          </>
        ) : item.cash_out ? (
          <>
            <Text style={styles.text}>Expenses: RM {item.cash_out}</Text>
            <Text style={styles.text}>Category: {item.category}</Text>
            <Text style={styles.text}>Date: {item.created_at}</Text>
          </>
        ) : null}
      </TouchableOpacity>
    );
  };
  // Call the function when needed (e.g., in a useEffect or button press)
  useEffect(() => {
    checkCashOutLimit();
  }, [email]);

  const todayCashFlows = displayData.filter(
    (item) => item.created_at === formattedToday
  );

  const incomeToday = todayCashFlows
    .filter((item) => item.cash_in > 0)
    .reduce((total, item) => total + item.cash_in, 0);

  const expensesToday = todayCashFlows
    .filter((item) => item.cash_out > 0)
    .reduce((total, item) => total + item.cash_out, 0);

  const chartData = [
    {
      name: translate("income"),
      population: incomeToday,
      color: "rgba(255, 255, 255, 0.3)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
    {
      name: translate("expenses"),
      population: expensesToday,
      color: "rgba(255, 255, 255, 0.5)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
  ];

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateText}>{section.title}</Text>
    </View>
  );
  
  // Group data by date
  const groupedData = groupByDate(getLast7DaysData(displayData));
  
  // Sort the date keys (dates) from latest to oldest
  const sortedDates = Object.keys(groupedData).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  
  // Convert grouped data into a format accepted by SectionList
  const sections: SectionData[] = sortedDates.map((date) => ({
    title: date,
    data: groupedData[date],
  }));

  return (
    <SafeAreaView style={styles.bodyMainContent}>
      <View style={styles.topNavContainer}>
        <View style={styles.topNavTextIncome}>
          <Text style={styles.valueText}>Income</Text>
          <Text style={styles.valueText}>RM {income}</Text>
        </View>
        <View style={styles.topNavTextExpenses}>
          <Text style={styles.valueTextExpenses}>Expenses</Text>
          <Text style={styles.valueTextExpenses}>RM {expenses}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.setLimitButton}
        >
          <Text style={styles.setLimitButtonText}>Daily Limit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceDisplay}>
        <Text style={styles.value}>Balance</Text>
        <Text style={styles.value}>RM {balance}</Text>
      </View>

      <View style={styles.bodyPieChart}>
        <PieChart
          data={chartData}
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
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.contentBodyDesign}>
          <SectionList
            sections={sections} 
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.flatListContent}
          />
        </View>
      </View>

      {/* Navigation container fixed at the bottom */}
      <View style={styles.navContainer}>
        <View style={styles.iconContainer}>
          {/* Record Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Record", { email })}
          >
            <Icon name="folder" size={30} color="#ffffff" />
          </TouchableOpacity>

          {/* Insert Icon (Centered and Highlighted) */}
          <TouchableOpacity
            style={[styles.iconButton, styles.largeIconButton]}
            onPress={() => navigation.navigate("Insert", { email })}
          >
            <Icon name="attach-money" size={50} color="#ffffff" />
          </TouchableOpacity>

          {/* Settings Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Settings", { email })}
          >
            <Icon name="settings" size={30} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={detailsVisible}
        onRequestClose={closeModal}
        transparent={true}
      >
        <View style={styles.modalContainPlace}>
          <View style={styles.modalDetailsContent}>
            {selectedItem && (
              <>
                <Text>Details</Text>
                <Text>Category: {selectedItem.category}</Text>
                <Text>Date: {selectedItem.created_at}</Text>
                <Text>Remark: {selectedItem.remark}</Text>
                <Text>
                  {selectedItem.cash_in !== 0
                    ? `Income: ${selectedItem.cash_in}`
                    : `Expenses: ${selectedItem.cash_out}`}
                </Text>
              </>
            )}
            <TouchableOpacity onPress={closeModal}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal for setting daily limit */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Daily Expense Limit</Text>
            <TextInput
              style={styles.input}
              value={dailyLimit}
              onChangeText={setDailyLimit}
              placeholder="Enter limit"
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={handleSaveLimit}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topNavContainer: {
    marginHorizontal: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceDisplay: {
    paddingTop: 10,
    alignItems: "center",
    marginHorizontal: 10,
  },
  topNavTextIncome: {
    padding: 5,
    position: "relative",
    width: "30%",
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "flex-start",
  },
  topNavTextExpenses: {
    padding: 5,
    position: "relative",
    width: "30%",
    borderRadius: 15,
    backgroundColor: "#FF0000",
    alignItems: "flex-start",
  },
  valueText: {
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  valueTextExpenses: {
    color: "#fff",
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  value: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  setLimitButton: {
    backgroundColor: "#f8b400",
    paddingVertical: 14,
    paddingHorizontal: 5,
    width: "30%",
    borderRadius: 15,
  },
  setLimitButtonText: {
    fontSize: 16,
    color: "#ffffff",
    alignSelf: "center",
  },
  bodyMainContent: {
    flex: 1,
    backgroundColor: "#000",
  },
  contentContainer: {
    flex: 1,
    padding: 10,
  },
  contentBodyDesign: {
    borderColor: "#fff",
    borderWidth: 2,
    borderRadius: 20,
  },
  todayDetails: {
    display: "flex",
    color: "#fff",
    textAlign: "center",
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 20,
  },
  flatListContent: {
    paddingTop: 5,
    marginVertical: 10,
    marginHorizontal: 10,
    paddingBottom: 50,
  },
  navContainer: {
    backgroundColor: "#d3d3d3",
    paddingVertical: 5,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  iconContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  iconButton: {
    padding: 5,
  },
  largeIconButton: {
    position: "absolute",
    borderRadius: 50,
    backgroundColor: "#000000",
    borderWidth: 3,
    borderColor: "#f8b400",
    padding: 10,
    bottom: 5,
    left: "50%",
    transform: [{ translateX: -35 }],
  },
  item: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  text: {
    fontSize: 16,
    color: "#fff",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    width: "100%",
    height: "100%",
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
    padding: 10,
    borderRadius: 5,
  },
  saveButton: {
    backgroundColor: "#00796b",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#00796b",
    fontSize: 16,
  },
  modalDetailsContent: {
    backgroundColor: "white",
    width: "80%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  modalContainPlace: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  bodyPieChart: {
    borderRadius: 20,
    marginHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dateHeader: {
    padding: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default MainPage;
