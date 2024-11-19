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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  time: string;
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
  const insets = useSafeAreaInsets();
  const [filteredData, setFilteredData] = useState<Data[]>([]);
  useEffect(() => {
    AsyncStorage.getItem("email").then((storedEmail) => {
      if (storedEmail) setEmail(storedEmail);
    });
  }, []);

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
  const groupByDateAndTime = (data: Data[]): { [key: string]: Data[] } => {
    const groupedData = data.reduce<{ [key: string]: Data[] }>((result, item) => {
      const date = new Date(item.created_at);  // Date part (YYYY-MM-DD)
      const time = item.time;  // Time part (HH:mm:ss)
      
      // Check if time is valid (non-null, non-empty)
      if (!time || time.trim() === "") {
        return result;  // Skip this item if time is invalid
      }
  
      // Combine the date and time into a full Date string (YYYY-MM-DDTHH:mm:ss)
      const combinedDateTime = `${item.created_at}T${item.time}`;
  
      // Create a Date object with the combined date and time
      const fullDateTime = new Date(combinedDateTime); 
  
      // If the combined date-time is valid, use it for grouping
      if (!isNaN(fullDateTime.getTime())) {
        const formattedDate = date.toISOString().split("T")[0];  // Extract the date part only (YYYY-MM-DD)
        
        if (!result[formattedDate]) {
          result[formattedDate] = [];
        }
  
        // Push the item into the grouped data array
        result[formattedDate].push({
          ...item,  // Copy the item properties
          created_at: fullDateTime.toISOString(), // Store the full combined Date-time in created_at
        });
      } else {
        console.error("Invalid Date-Time:", combinedDateTime);
      }
  
      return result;
    }, {});
  
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
                <Text style={styles.text}>Time: {item.time}</Text>
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
                ) : item.category === "Food" || item.category === "食品" ? (
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
                <Text style={styles.text}>Time: {item.time}</Text>
              </View>
            </View>
          </>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateText}>{section.title}</Text>
    </View>
  );

  // Group data by date
  const groupedData = groupByDateAndTime(getLast7DaysData(displayData));

  // Sort the date keys (dates) from latest to oldest
  const sortedDates = Object.keys(groupedData).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  
  // Convert grouped data into a format accepted by SectionList
  const sections: SectionData[] = sortedDates.map((date) => {
    const sortedDataByTime = groupedData[date].sort((a, b) => {
      // Combine date and time to create a full timestamp
      const timestampA = new Date(`${date}T${a.time}`).getTime();
      const timestampB = new Date(`${date}T${b.time}`).getTime();
  
      return timestampB - timestampA; // Sort by time, latest first
    });
  
    return {
      title: date,
      data: sortedDataByTime,
    };
  });


      const handleTodayClick = () => {
        const todayData = getLast7DaysData(displayData);
        setFilteredData(todayData);
      };

      const handleWeekdayClick = () => {
        const weekData = getLast7DaysData(displayData);
        setFilteredData(weekData);
      };

      const handleMonthlyClick = () => {
        const monthData = getLast7DaysData(displayData);
        setFilteredData(monthData);
      };

      const handleDateClick = (selectedDate: Date) => {
        const dateData = getCustomDateData(displayData, selectedDate);
        setFilteredData(dateData);
      };


  
  const getCustomDateData = (data: Data[], selectedDate: Date): Data[] => {
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
  
    return data.filter((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= startOfDay && itemDate <= endOfDay;
    });
  };


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
          <Text style={styles.valueTextDefault}>Balances</Text>
          <Text style={styles.value}>RM {balance}</Text>
        </View>
      </View>

      {/* <View>
        <TouchableOpacity onPress={handleTodayClick}>
          <Text style={{color: "#fff"}}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleWeekdayClick}>
          <Text style={{color: "#fff"}}>Weekday</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMonthlyClick}>
          <Text style={{color: "#fff"}}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDateClick}>
          <Text style={{color: "#fff"}}>Date</Text>
        </TouchableOpacity>
      </View> */}

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
    <View style={[styles.iconContainer, { paddingTop: insets.top }]}>
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
            <Icon name="add" size={35} color="#ffffff" />
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
                <Text style={styles.valueTextDefault}>
                  Time: {selectedItem.time}
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
    height: "7%", 
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
    borderWidth: 2,
    borderColor: "#f8b400",
    paddingVertical: 10,
    paddingHorizontal: 10,
    height: "120%",
    bottom: 15,
  },
  item: {
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
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    marginLeft: 40,
  },
  defaultCircleDesign: {
    justifyContent: 'space-between',
    flexDirection: "row",
  },
  detailsCircle:{
    color: "#fff",
    marginBottom: 30,
    fontSize: 12,
    right: 60,
    top: 10,
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
    paddingTop: 5,
    marginBottom: 10,
  },
  iconContainerDisplay: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
  },
  textContainer: {
    flex: 2, 
    justifyContent: "center",
    padding: 5,
  },
});

export default MainPage;
