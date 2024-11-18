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
  const [detailsVisible, setDetailsVisible] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootParamList, "MainPage">>();
  const email = route.params?.email || "No email provided";
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];
  useEffect(() => {
    AsyncStorage.getItem("email").then((storedEmail) => {
      if (storedEmail) setEmail(storedEmail);
    });
  }, []);

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
        const formattedDate = date.toISOString().split("T")[0]; // Using ISO format (YYYY-MM-DD)

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
            <View style={styles.itemDisplay}>
              <View style={styles.iconContainerDisplay}>
                {/* Conditionally render icons based on category */}
                {item.category === "Salary" || item.category === "薪水" ? (
                  <Icon
                    name="money"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : item.category === "Other" || item.category === "其他" ? (
                  <Icon
                    name="category"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : item.category === "Gift" || item.category === "礼物" ? (
                  <Icon
                    name="card-giftcard"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : item.category === "Saving" || item.category === "储蓄"? (
                  <Icon
                    name="savings"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : 
                item.category === "Inves" || item.category === "投资" ? (
                  <Icon
                    name="trending-up"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ): null}
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.text}>Category: {item.category}</Text>
                <Text style={styles.text}>Income: RM {item.cash_in}</Text>
                <Text style={styles.text}>Date: {formattedDate}</Text>
              </View>
            </View>
            {/* Add more categories here as needed */}
          </>
        ) : item.cash_out ? (
          <>
            <View style={styles.itemDisplay}>
              <View style={styles.iconContainerDisplay}>
                {/* Conditionally render icons based on category */}
                {item.category === "Rent" || item.category === "租金" ? (
                  <Icon
                    name="home"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : item.category === "Food" || item.category === "食物" ? (
                  <Icon
                    name="fastfood"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : item.category === "Transport" || item.category === "交通" ? (
                  <Icon
                    name="commute"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : item.category === "Play" || item.category === "娱乐" ? (
                  <Icon
                    name="savings"
                    size={30}
                    color="#FFFFFF"
                    style={styles.icon}
                  />
                ) : null}
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.text}>Category: {item.category}</Text>
                <Text style={styles.text}>Income: RM {item.cash_out}</Text>
                <Text style={styles.text}>Date: {formattedDate}</Text>
              </View>
            </View>
          </>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Call the function when needed (e.g., in a useEffect or button press)
  useEffect(() => {
    checkCashOutLimit();
  }, [email]);

  useFocusEffect(
    React.useCallback(() => {
      checkCashOutLimit();
    }, [email])
  );

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
      color: incomeToday
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(255, 255, 255, 0.8)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
    {
      name: translate("expenses"),
      population: expensesToday,
      color: expensesToday
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(255, 255, 255, 0.8)",
      legendFontColor: "#fff",
      legendFontSize: 15,
    },
  ];

  const isDataEmpty = chartData.every((item) => item.population === 0);

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
          <Text style={styles.valueTextDefault}>Income</Text>
          <Text style={styles.valueText}>RM {income}</Text>
        </View>
        <View style={styles.topNavTextExpenses}>
          <Text style={styles.valueTextDefault}>Expenses</Text>
          <Text style={styles.valueTextExpenses}>RM {expenses}</Text>
        </View>
        <View style={styles.balanceDisplay}>
          <Text style={styles.valueTextDefault}>Balance</Text>
          <Text style={styles.value}>RM {balance}</Text>
        </View>
      </View>

      <View style={styles.bodyPieChart}>
        <View>
          <Text style={styles.overviewPie}>Overview Daily</Text>
        </View>
        {isDataEmpty ? (
          <View style={styles.fallbackCircle} />
        ) : (
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
        )}
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
            <Icon name="folder" size={25} color="#ffffff" />
            <Text style={styles.valueTextNav}>Report</Text>
          </TouchableOpacity>

          {/* Insert Icon (Centered and Highlighted) */}
          <TouchableOpacity
            style={[styles.iconButton, styles.largeIconButton]}
            onPress={() => navigation.navigate("Insert", { email })}
          >
            <Icon name="library-books" size={25} color="#ffffff" />
            <Text style={styles.valueTextNav}>Record</Text>
          </TouchableOpacity>

          {/* Settings Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Settings", { email })}
          >
            <Icon name="settings" size={25} color="#ffffff" />
            <Text style={styles.valueTextNav}>Setting</Text>
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
                <Text style={styles.valueTextDefault}>Details</Text>
                <Text style={styles.valueTextDefault}>
                  Category: {selectedItem.category}
                </Text>
                <Text style={styles.valueTextDefault}>
                  Date: {selectedItem.created_at}
                </Text>
                <Text style={styles.valueTextDefault}>
                  Remark: {selectedItem.remark}
                </Text>
                <Text>
                  {selectedItem.cash_in !== 0
                    ? `Income: ${selectedItem.cash_in}`
                    : `Expenses: ${selectedItem.cash_out}`}
                </Text>
              </>
            )}
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.valueTextDefault}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topNavContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 10,
    marginVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f8b400",
    borderRadius: 20,
  },
  balanceDisplay: {
    paddingTop: 10,
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 10,
  },
  topNavTextIncome: {
    padding: 5,
    position: "relative",
    width: "30%",
    borderRadius: 15,
    alignItems: "flex-start",
  },
  topNavTextExpenses: {
    padding: 5,
    position: "relative",
    width: "30%",
    borderRadius: 15,
    alignItems: "flex-start",
  },
  valueText: {
    color: "rgba(124, 252, 0,1)",
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  valueTextExpenses: {
    color: "rgba(255,0,0, 1)",
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  value: {
    color: "rgba(124, 252, 0,1)",
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  valueTextDefault: {
    color: "#fff",
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  valueTextNav: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
    display: "flex",
    alignSelf: "center",
  },
  setLimitButton: {
    position: "absolute",
    top: 5,
    right: 10,
    paddingVertical: 10,
    paddingHorizontal: 5,
    width: "30%",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#f8b400",
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
    position: "relative",
  },
  contentBodyDesign: {
    borderColor: "#f8b400",
    borderWidth: 2,
    borderRadius: 20,
  },
  flatListContent: {
    paddingTop: 5,
    marginVertical: 10,
    marginHorizontal: 10,
    paddingBottom: 80,
  },
  navContainer: {
    backgroundColor: "#000000",
    paddingVertical: 5,
    position: "absolute",
    bottom: 0,
    zIndex: 1,
    width: "100%",
    borderRadius: 20,
    textAlign: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f8b400",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  iconButton: {
    padding: 5,
  },
  largeIconButton: {
    justifyContent: "center",
    alignContent: "center",
    position: "relative",
    borderRadius: 50,
    backgroundColor: "#000000",
    borderWidth: 3,
    borderColor: "#f8b400",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  item: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "#f8b400",
    borderWidth: 2,
  },
  text: {
    fontSize: 16,
    color: "#fff",
  },

  modalDetailsContent: {
    backgroundColor: "#000000",
    width: "80%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#f8b400",
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
    borderColor: "#f8b400",
    borderWidth: 2,
  },
  overviewPie: {
    textAlign: "center",
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    paddingVertical: 10,
  },
  fallbackCircle: {
    marginVertical: 20,
    width: 170,
    height: 170,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    marginLeft: 40,
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
  icon: {
    marginRight: 5,
    position: "relative",
    justifyContent: "flex-start",
  },
  itemDisplay: {
    flexDirection: "row", 
    alignItems: "center", 
    padding: 10,
    marginBottom: 10,
  },
  iconContainerDisplay: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
  },
  textContainer: {
    flex: 3, 
    justifyContent: "center",
    paddingLeft: 10, 
  },
});

export default MainPage;
