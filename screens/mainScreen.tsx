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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import supabase from "../supabaseClient";

type Language = "en" | "zh";
type TranslationKeys =
  | "welcomeUser"
  | "profile"
  | "displayRecord"
  | "cashFlow"
  | "settings";

type RootParamList = {
  MainPage: { email: string };
  Profile: { email: string };
  Record: { email: string };
  Insert: { email: string };
  Settings: { email: string };
};
const translate = (
  key: TranslationKeys,
  language: Language,
  params?: any
): string => {
  let translation = translations[language][key] || key;
  if (params) {
    Object.keys(params).forEach((paramKey) => {
      translation = translation.replace(`{${paramKey}}`, params[paramKey]);
    });
  }
  return translation;
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

const MainPage = () => {
  const [displayData, setDisplayData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [emails, setEmail] = useState<string>("");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [balance, setBalance] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date())
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootParamList, "MainPage">>();
  const email = route.params?.email || "No email provided";

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

  const renderItem = ({ item }: { item: Data }) => (
    <View style={styles.item}>
      {item.cash_in !== 0 ? (
        <>
          <Text style={styles.text}>Income: {item.cash_in}</Text>
          <Text style={styles.text}>Category: {item.category}</Text>
          <Text style={styles.text}>Remark: {item.remark}</Text>
          <Text style={styles.text}>Date: {item.created_at}</Text>
        </>
      ) : item.cash_out ? (
        <>
          <Text style={styles.text}>Expenses: {item.cash_out}</Text>
          <Text style={styles.text}>Category: {item.category}</Text>
          <Text style={styles.text}>Remark: {item.remark}</Text>
          <Text style={styles.text}>Date: {item.created_at}</Text>
        </>
      ) : null}
    </View>
  );

  const handleSaveLimit = async () => {
    try {
      // Step 1: Check if the email already exists in the table
      const { data: existingData, error: fetchError } = await supabase
        .from('daily_expenses')
        .select('*')
        .eq('email', email);
  
      if (fetchError && fetchError.code !== 'PGRST116') {
        // Handle fetch error if it's not a "not found" error
        Alert.alert('Error', 'An error occurred while checking the email.');
        return;
      }
  
      let operationError;
      if (existingData && existingData.length > 0) { // Check if the array is not empty
        // Step 2: If the email exists, update the existing record
        const { error: updateError } = await supabase
          .from('daily_expenses')
          .update({ limit_value: dailyLimit })
          .eq('email', email);
  
        operationError = updateError;
      } else {
        // Step 3: If the email does not exist, insert a new record
        const { error: insertError } = await supabase
          .from('daily_expenses')
          .insert([
            { 
              email: email,
              limit_value: dailyLimit,
            }
          ]);
  
        operationError = insertError;
      }
  
      // Handle any errors that occurred during the update or insert
      if (operationError) {
        Alert.alert('Error', 'Failed to update or insert. Please try again.');
      } else {
        Alert.alert('Success', 'Daily limit has been set up.');
        setModalVisible(false);
        setDailyLimit('');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An error occurred while submitting the data.');
    }
  };
  const checkCashOutLimit = async () => {
    try {
      // Step 1: Fetch the limit value from the daily_expenses table
      const { data: limitData, error: limitError } = await supabase
        .from('daily_expenses')
        .select('limit_value, notification, date')
        .eq('email', email);
  
      if (limitError || !limitData) {
        Alert.alert('Error', 'Failed to retrieve the daily limit.');
        return;
      }
  
      const dailyLimit = limitData[0].limit_value;
      const notified = limitData[0].notification;
      const lastNotificationDate = limitData[0].date;
  
      // Step 2: Check if it's a new day and reset the notified flag
      const currentDate = new Date().toISOString().split('T')[0]; // Format the date to YYYY-MM-DD
      if (currentDate !== lastNotificationDate) {
        // If it's a new day, reset the notified flag
        const { error: resetError } = await supabase
          .from('daily_expenses')
          .update({ notification: false, date: currentDate }) // Update the date as well
          .eq('email', email);
  
        if (resetError) {
          console.error('Failed to reset notified flag:', resetError);
        }
      }
      if (notified && currentDate === lastNotificationDate) {
        return; 
      }
  
      // Step 3: Fetch the total cash_out from the cash_flows table for today
      const { data: cashOutData, error: cashOutError } = await supabase
        .from('cash_flows')
        .select('cash_out')
        .eq('email', email)
        .eq('created_at', currentDate); // Filter by today's date
  
      if (cashOutError) {
        Alert.alert('Error', 'Failed to retrieve cash out data.');
        return;
      }
  
      // Calculate the total cash_out for today
      const totalCashOut = cashOutData.reduce((total, record) => total + record.cash_out, 0);
  
      // Step 4: Compare the total cash_out with the daily limit
      if (totalCashOut > dailyLimit && !notified) {
        // Step 5: Send a notification if the limit is exceeded and the user hasn't been notified today
        Alert.alert('Notice', 'You have exceeded your daily cash out limit!');
  
        // Mark the user as notified today
        const { error: updateError } = await supabase
          .from('daily_expenses')
          .update({ notification: true })
          .eq('email', email)
          .eq('date', currentDate);
  
        if (updateError) {
          Alert.alert('Error', 'Failed to mark notification as acknowledged.');
        }
      } else {
        Alert.alert('Warning', 'You are within your daily limit.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An error occurred while checking the cash out limit.');
    }
  };
  
  // Call the function when needed (e.g., in a useEffect or button press)
  useEffect(() => {
    checkCashOutLimit();
  }, [email]);
  


  return (
    <SafeAreaView style={styles.bodyMainContent}>
      <View style={styles.topNavContainer}>
        <View style={styles.topNavText}>
          <Icon name="attach-money" size={24} color="#00796b" />
          <Text style={styles.value}>RM {income}</Text>
        </View>
        <View style={styles.topNavText}>
          <Icon name="payment" size={24} color="#00796b" />
          <Text style={styles.value}>RM {expenses}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.setLimitButton}
        >
          <Text style={styles.setLimitButtonText}>Daily Limit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.balanceDisplay}>
        <Icon name="account-balance-wallet" size={24} color="#00796b" />
        <Text style={styles.value}>RM {balance}</Text>
      </View>

      <View style={styles.contentContainer}>
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.flatListContent}
        />
      </View>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topNavContainer: {
    marginHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 40,
    alignItems: "center",
  },
  balanceDisplay: {
    alignItems: "flex-start",
    marginHorizontal: 10,
  },
  topNavText: {
    alignItems: "flex-start",
  },
  value: {
    fontSize: 16,
    color: "#00796b",
    fontWeight: "bold",
  },
  setLimitButton: {
    backgroundColor: "#f8b400",
    padding: 8,
    borderRadius: 15,
  },
  setLimitButtonText: {
    fontSize: 10,
    color: "#ffffff",
  },
  bodyMainContent: {
    flex: 1,
    backgroundColor: "#fce9db",
  },
  contentContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingTop: 5,
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
    position: 'absolute', 
    borderRadius: 50, 
    backgroundColor: "#f8b400", 
    padding: 10, 
    bottom: 5, 
    left: "50%",
    alignContent:'center',
    transform: [{ translateX: -40 }],
  },
  item: {
    padding: 10,
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
});

export default MainPage;
