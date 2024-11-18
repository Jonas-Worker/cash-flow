import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import supabase from "../supabaseClient";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import { useFocusEffect } from "@react-navigation/native";
type RootParamList = {
  MainPage: { email: string };
  Profile: { email: string };
  Record: { email: string };
  Insert: { email: string };
  Settings: undefined;
};

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
  | "selectSubcategory"
  | "selectDate"
  | "amount"
  | "stock"
  | "reward"
  | "saving"
  | "submit";

const InsertScreen = ({ navigation }: any) => {
  const [cashIn, setCashIn] = useState("");
  const [cashOut, setCashOut] = useState("");
  const [date, setDate] = useState("");
  const [remark, setRemark] = useState("");
  const [remarkCategory, setRemarkCategory] = useState<
    "Income" | "Expenses" | "Other"
  >("Income");
  const [remarkSubCategory, setRemarkSubCategory] = useState("");
  const [error, setError] = useState("");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const route = useRoute<RouteProp<RootParamList, "Insert">>();
  const email = route.params?.email || "No email provided";
  const [language, setLanguage] = useState<Language>("en");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisibleFeature, setModalVisibleFeature] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

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
  const handleSubmit = async () => {
    setError("");
    const validCashIn =
      cashIn.trim() === "" || isNaN(Number(cashIn)) ? "0" : cashIn;
    const validCashOut =
      cashOut.trim() === "" || isNaN(Number(cashOut)) ? "0" : cashOut;

    const category = remarkSubCategory;

    if (!remarkSubCategory) {
      setError("Please select a valid category.");
      return;
    }

    const currentDate =
      date.trim() === "" ? new Date().toLocaleDateString("en-CA") : date;

    try {
      // Insert the new cash flow data
      const { data, error } = await supabase.from("cash_flows").insert([
        {
          remark: remark,
          category: category,
          cash_in:
            remarkCategory === "Income" &&
            !isNaN(Number(validCashIn)) &&
            validCashIn.trim() !== ""
              ? validCashIn
              : "0",
          cash_out:
            remarkCategory === "Expenses" &&
            !isNaN(Number(validCashOut)) &&
            validCashOut.trim() !== ""
              ? validCashOut
              : "0",

          created_at: currentDate,
          email: email,
        },
      ]);

      if (error) {
        console.error(error);
        setError("Error inserting data: " + error.message);
        return;
      }

      // After inserting, sum up the cash_out for the specific date
      const { data: cashFlows, error: fetchError } = await supabase
        .from("cash_flows")
        .select("cash_out")
        .eq("created_at", currentDate)
        .eq("email", email);

      if (fetchError) {
        console.error(fetchError);
        setError("Error fetching cash flows: " + fetchError.message);
        return;
      }

      // Calculate the total cash_out for the given date
      const totalCashOut = cashFlows.reduce(
        (acc, item) => acc + parseFloat(item.cash_out),
        0
      );

      // Update the daily_expenses column with the sum of cash_out
      const { error: updateError } = await supabase
        .from("cash_flows")
        .update({ daily_expenses: totalCashOut })
        .eq("created_at", currentDate)
        .eq("email", email);

      if (updateError) {
        console.error(updateError);
        setError("Error updating daily expenses: " + updateError.message);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while submitting the data");
    }
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
  const handlePress = (value: string | number) => {
    if (value === "=") {
      try {
        const calculatedResult = eval(input);
        setResult(calculatedResult.toString());
  
        // Save the result based on the category
        if (remarkCategory === "Income") {
          setCashIn(calculatedResult.toString());
          setCashOut("");
        } else if (remarkCategory === "Expenses") {
          setCashOut(calculatedResult.toString());
          setCashIn("");
        }
  
        // Update the input with the calculated result
        setInput(calculatedResult.toString());
      } catch (e) {
        setResult("Error");
        setInput("Error");
      }
    } else if (value === "C") {
      setInput("");
      setResult("");
      setCashIn("");
      setCashOut("");
    } else if (value === "Del") {
      setInput((prev) => prev.slice(0, -1)); 
    } else {
      setInput((prev) => prev + value);
    }
  };
  

  const handleDateConfirm = (selectedDate: any) => {
    setDate(selectedDate.toLocaleDateString());
    setDatePickerVisibility(false);
  };

  const handleDateCancel = () => {
    setDatePickerVisibility(false);
  };

  const incomeCategories = [
    translate("salary"),
    translate("gift"),
    translate("inves"),
    translate("other"),
    translate("reward"),
    translate("saving"),
  ];
  const expenseCategories = [
    translate("food"),
    translate("transport"),
    translate("rent"),
    translate("play"),
    translate("health"),
    translate("study"),
  ];

  return (
    <ScrollView style={styles.bodyInsertContainer}>
      <View style={styles.container}>
        <View style={styles.categoryButtons}>
          <TouchableOpacity
            style={[
              styles.button,
              remarkCategory === "Income" && styles.selectedButton,
            ]}
            onPress={() => setRemarkCategory("Income")}
          >
            <Text style={styles.buttonText}>{translate("income")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              remarkCategory === "Expenses" && styles.selectedButton,
            ]}
            onPress={() => setRemarkCategory("Expenses")}
          >
            <Text style={styles.buttonText}>{translate("expenses")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              remarkCategory === "Other" && styles.selectedButton,
            ]}
            onPress={() => setModalVisibleFeature(true)}
          >
            <Text style={styles.buttonText}>{translate("other")}</Text>
          </TouchableOpacity>
        </View>
        <Text>{translate("selectSubcategory")}:</Text>
        <View style={styles.categoryList}>
          {(remarkCategory === "Income"
            ? incomeCategories
            : expenseCategories
          ).map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.subCategoryButton,
                remarkSubCategory === category && styles.selectedSubCategory,
              ]}
              onPress={() => setRemarkSubCategory(category)}
            >
              {/* Render icons for specific categories */}
              {category === translate("salary") && (
                <Icon
                  name="money"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("other") && (
                <Icon
                  name="th-large"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("reward") && (
                <Icon
                  name="credit-card"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("saving") && (
                <Icon
                  name="bank"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("gift") && (
                <Icon
                  name="gift"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("inves") && (
                <Icon
                  name="line-chart"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("food") && (
                <Icon
                  name="cutlery"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("transport") && (
                <Icon
                  name="car"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("rent") && (
                <Icon
                  name="home"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("play") && (
                <Icon
                  name="gamepad"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("health") && (
                <Icon
                  name="heartbeat"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              {category === translate("study") && (
                <Icon
                  name="book"
                  size={20}
                  color="#000000"
                  style={styles.icon}
                />
              )}
              <Text style={styles.buttonTextCategory}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text>{translate("date")}:</Text>
        <TouchableOpacity
          style={styles.inputDate}
          onPress={() => setDatePickerVisibility(true)}
        >
          <Text style={styles.dateValue}>
            {date ? date : translate("selectDate")}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
        />
        <Text>{translate("remark")}:</Text>
        <TextInput
          placeholder={translate("remark")}
          style={styles.input}
          value={remark}
          onChangeText={setRemark}
        ></TextInput>

       
        <View>
          <Text>{translate("amount")}:</Text>
           <View style={styles.row}>
           <TextInput
            style={styles.inputCalculater}
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            placeholder="0"
            editable={false} 
            pointerEvents="none" 
          />
            {["/", "Del"].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.buttonCalculator}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.buttonTextCalculator}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {["7", "8", "9", "*"].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.buttonCalculator}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.buttonTextCalculator}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {["4", "5", "6", "-"].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.buttonCalculator}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.buttonTextCalculator}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {["1", "2", "3", "+"].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.buttonCalculator}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.buttonTextCalculator}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {["0", ".", "C", "="].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.buttonCalculator}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.buttonTextCalculator}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={handleSubmit} style={styles.buttonSubmit}>
          <Text style={styles.buttonText}>{translate("submit")}</Text>
        </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily Expense Limit</Text>
            <TextInput
              style={styles.inputModal}
              value={dailyLimit}
              onChangeText={setDailyLimit}
              placeholder="Enter value"
              keyboardType="numeric"
              placeholderTextColor="#FFFFFF"
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
      <Modal
       animationType="slide"
       transparent={true}
       visible={modalVisibleFeature}
       onRequestClose={() => setModalVisibleFeature(false)}
       >
        <View style={styles.featureDesignContain}>
        <View style={styles.modalContent}>
        <Text style={styles.modalTitleFeature}>Other Setting</Text>
          <View style={styles.featureButtonDesign}>
          <TouchableOpacity
            onPress={()=> setModalVisible(true)}>
            <Text style={styles.modalTitleFeature}>Daily Expenses</Text>
          </TouchableOpacity>
          </View>
          <View style={styles.featureButtonDesign}>
          <TouchableOpacity>
            <Text style={styles.modalTitleFeature}>Monthly Expenses</Text>
          </TouchableOpacity>
          </View>
          <View style={styles.featureButtonDesign}>
          <TouchableOpacity>
            <Text style={styles.modalTitleFeature}>Target Monthly Saving</Text>
          </TouchableOpacity>
          </View>
          <View style={styles.featureButtonDesign}>
          <TouchableOpacity>
            <Text style={styles.modalTitleFeature}>Target Yearly Saving</Text>
          </TouchableOpacity>
          </View>
          <View style={styles.featureButtonDesignClose}>
          <TouchableOpacity
              onPress={() => setModalVisibleFeature(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonTextFeature}>X</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>
       </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bodyInsertContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "scroll",
  },
  container: {
    display: "flex",
    marginHorizontal: 10,
    marginTop: 20,
    overflow: "scroll",
  },
  categoryButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  button: {
    padding: 5,
    borderRadius: 15,
    width: "30%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f8b400",
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: "#f8b400",
    backgroundColor: "#d3d3d3",
  },
  buttonText: {
    color: "#0000000",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginVertical: 10,
    paddingLeft: 10,
    borderRadius: 10,
  },
  inputDate: {
    width: 150,
    height: 30,
    marginVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#f8b400",
    justifyContent: "center",
  },
  dateValue: {
    textAlign: "center",
  },
  categoryList: {
    width: "100%",
    marginVertical: 10,
    flexWrap: "wrap",
    flexDirection: "row",
  },
  subCategoryButton: {
    display: "flex",
    width: 105,
    padding: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 10,
    marginRight: "3%",
    marginLeft: "3%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 2,
    borderColor: "#f8b400",
  },
  buttonTextCategory: {
    color: "#0000000",
    fontSize: 14,
  },
  selectedSubCategory: {
    backgroundColor: "#d3d3d3",
  },
  icon: {
    marginRight: 5,
    position: "relative",
    justifyContent: "flex-start",
  },
  error: {
    color: "red",
    marginTop: 10,
  },
  buttonSubmit: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 15,
    width: "45%",
    alignItems: "center",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#f8b400",
  },
  // Modal Design
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#000000",
    padding: 20,
    width: "90%",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#f8b400",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  inputModal: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
    padding: 10,
    borderRadius: 5,
    color: "#ffffff",
  },
  saveButton: {
    backgroundColor: "#000000",
    width: 100,
    alignSelf: "center",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f8b400",
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
    color: "#ffffff",
    fontSize: 16,
  },
  // Calculator Design
  inputCalculater: {
    height: "80%",
    marginTop: 5,
    fontSize: 15,
    textAlign: "right",
    color: "#888",
    width: "50%",
    borderWidth: 2,
    borderRadius: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  buttonCalculator: {
    flex: 1,
    margin: 5,
    padding: 15,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#f8b400",
  },
  buttonTextCalculator: {
    fontSize: 15,
  },
  equalsButton: {
    backgroundColor: "#f39c12",
  },
  //Feature Design
  featureDesignContain: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: "relative",
  },
  featureButtonDesign: {
    top: 20,
    width: "90%",
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#f8b400",
    justifyContent: "center",
    alignSelf: "center",
  },
  modalTitleFeature: {
    color: "#ffffff",
    padding: 10,
    fontSize: 20,
    textAlign: "center",
  },
  featureButtonDesignClose: {
    position: "absolute",
    right: 15,
    top: 0,
  },
  cancelButtonTextFeature: {
    color: "#fff",
    fontSize: 25,
  },
});

export default InsertScreen;
