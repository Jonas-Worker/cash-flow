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
  SafeAreaView,
} from "react-native";
import supabase from "../supabaseClient";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import { useFocusEffect } from "@react-navigation/native";
import { evaluate } from "mathjs";

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
  | "submit"
  | "transfer"
  | "monthlyBudget"
  | "target"
  | "targetYear"
  | "otherSetting";

const InsertScreen = ({ navigation }: any) => {
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
  const [modalVisibleSaving, setModalVisibleSaving] = useState(false);
  const [modalVisibleFeature, setModalVisibleFeature] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [input, setInput] = useState("");
  const currentDate = new Date();
  const timeOnly = currentDate.toTimeString().split(" ")[0];
  const [modalVisibleRate, setModalVisibleRate] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState<string | null>(null);

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
      input.trim() === "" || isNaN(Number(input)) ? "0" : input;
    const validCashOut =
      input.trim() === "" || isNaN(Number(input)) ? "0" : input;

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
          time: timeOnly,
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
        .from("planning")
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
          .from("planning")
          .update({ limit_value: dailyLimit })
          .eq("email", email);

        operationError = updateError;
      } else {
        // Step 3: If the email does not exist, insert a new record
        const { error: insertError } = await supabase.from("planning").insert([
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
        Alert.alert("Success", "Budget have setup.");
        setModalVisible(false);
        setDailyLimit("");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while submitting the data.");
    }
  };

  const handleSaveTarget = async () => {
    try {
      // Step 1: Check if the email already exists in the table
      const { data: existingData, error: fetchError } = await supabase
        .from("planning")
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
          .from("planning")
          .update({ target_value: targetValue })
          .eq("email", email);

        operationError = updateError;
      } else {
        // Step 3: If the email does not exist, insert a new record
        const { error: insertError } = await supabase.from("planning").insert([
          {
            email: email,
            target_value: targetValue,
          },
        ]);

        operationError = insertError;
      }

      // Handle any errors that occurred during the update or insert
      if (operationError) {
        Alert.alert("Error", "Failed to update or insert. Please try again.");
      } else {
        Alert.alert("Success", "Target set up.");
        setModalVisibleSaving(false);
        setTargetValue("");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while submitting the data.");
    }
  };
  useEffect(() => {
    if (remarkCategory === "Income") {
      setInput("");
    } else if (remarkCategory === "Expenses") {
      setInput("");
    }
  }, [remarkCategory]);

  const handlePress = (value: string | number) => {
    if (value === "=") {
      try {
        const evaluation = eval(input);
        setInput(evaluation.toString());
      } catch (error) {}
    } else if (value === "C") {
      setInput("");
    } else if (value === "Del") {
      setInput((prev) => prev.slice(0, -1));
    } else if (typeof value === "string") {
      setInput((prev) => {
        if (["+", "-", "*", "/"].includes(value) && prev === "") {
          return prev;
        }
        if (
          ["+", "-", "*", "/"].includes(value) &&
          ["+", "-", "*", "/"].includes(prev.slice(-1))
        ) {
          return prev;
        }
        return prev + value;
      });
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
    translate("transfer"),
  ];

  const calculateHomeLoan = () => {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / 12 / 100;
    const n = parseFloat(years) * 12;

    if (!P || !r || !n) {
      setMonthlyPayment("Error: Invalid input");
      return;
    }

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setMonthlyPayment(emi.toFixed(2));
  };
  const handleCloseModal = () => {
    // 清空所有值
    setPrincipal("");
    setRate("");
    setYears("");
    setMonthlyPayment("");
    // 关闭 Modal
    setModalVisibleRate(false);
  };

  return (
    <ScrollView style={styles.bodyInsertContainer}>
      <SafeAreaView>
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
          <Text style={{ color: "#fff" }}>
            {translate("selectSubcategory")}:
          </Text>
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
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("other") && (
                  <Icon
                    name="th-large"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("reward") && (
                  <Icon
                    name="credit-card"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("saving") && (
                  <Icon
                    name="bank"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("gift") && (
                  <Icon
                    name="gift"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("inves") && (
                  <Icon
                    name="line-chart"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("food") && (
                  <Icon
                    name="cutlery"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("transport") && (
                  <Icon name="car" size={20} color="#fff" style={styles.icon} />
                )}
                {category === translate("rent") && (
                  <Icon
                    name="home"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("play") && (
                  <Icon
                    name="gamepad"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("health") && (
                  <Icon
                    name="heartbeat"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                {category === translate("transfer") && (
                  <Icon
                    name="exchange"
                    size={20}
                    color="#fff"
                    style={styles.icon}
                  />
                )}
                <Text style={styles.buttonTextCategory}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ color: "#fff" }}>{translate("date")}:</Text>
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
          <Text style={{ color: "#fff" }}>{translate("remark")}:</Text>
          <TextInput
            placeholder={translate("remark")}
            style={styles.input}
            value={remark}
            onChangeText={setRemark}
            placeholderTextColor="#fff"
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
                placeholderTextColor="#fff"
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
              <Text style={styles.modalTitle}>{translate("monthlyBudget")}</Text>
              <TextInput
                style={styles.inputModal}
                value={dailyLimit}
                onChangeText={setDailyLimit}
                placeholder="Enter value"
                keyboardType="numeric"
                placeholderTextColor="#fff"
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
                <Text style={styles.cancelButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisibleSaving}
          onRequestClose={() => setModalVisibleSaving(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}> {translate("targetYear")}</Text>
              <TextInput
                style={styles.inputModal}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder="Enter value"
                keyboardType="numeric"
                placeholderTextColor="#fff"
              />
              <TouchableOpacity
                onPress={handleSaveTarget}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisibleSaving(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>X</Text>
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
              <Text style={styles.modalTitleFeature}>
                {translate("otherSetting")}
              </Text>
              <View style={styles.featureButtonDesign}>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                  <Text style={styles.modalTitleFeature}>
                    {translate("monthlyBudget")}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.featureButtonDesign}>
                <TouchableOpacity onPress={() => setModalVisibleSaving(true)}>
                  <Text style={styles.modalTitleFeature}>
                    {translate("targetYear")}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.featureButtonDesign}>
                <TouchableOpacity onPress={() => setModalVisibleRate(true)}>
                  <Text style={styles.modalTitleFeature}>
                    {"Calculate Rate Loan"}
                  </Text>
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
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisibleRate}
          onRequestClose={() => setModalVisibleRate(false)}
        >
          <View style={styles.modalContainerFullPage}>
            <View style={styles.modalContentRate}>
              <Text style={styles.header}>Loan Calculator</Text>

              {/* Input Fields */}
              <Text style={{ color: "#fff" }}>Principal Amount (RM)</Text>
              <TextInput
                style={styles.input}
                placeholder="Principal Amount (RM)"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={principal}
                onChangeText={setPrincipal}
              />
              <Text style={{ color: "#fff" }}>Annual Interest Rate (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="Annual Interest Rate (%)"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
              />
              <Text style={{ color: "#fff" }}>Loan Tenure (Years)</Text>
              <TextInput
                style={styles.input}
                placeholder="Loan Tenure (Years)"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={years}
                onChangeText={setYears}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={calculateHomeLoan}
              >
                <Text style={styles.buttonText}>Calculate</Text>
              </TouchableOpacity>
              <Text style={styles.resultText}>Monthly Payment: </Text>
              <Text style={styles.resultText}>
                {monthlyPayment ? `RM${monthlyPayment}` : null}
              </Text>

              <TouchableOpacity
                style={[styles.closeButtonLoan]}
                onPress={() => handleCloseModal()}
              >
                <Text style={styles.buttonTextLoan}>X</Text>
              </TouchableOpacity>
              <Text style={{ color: "#fff" }}>*此计算器仅供参考。</Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bodyInsertContainer: {
    flex: 1,
    backgroundColor: "#000000",
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
    color: "#fff",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginVertical: 10,
    paddingLeft: 10,
    borderRadius: 10,
    color: "#fff",
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
    color: "#fff",
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
    color: "#fff",
    fontSize: 14,
  },
  selectedSubCategory: {
    backgroundColor: "#d3d3d3",
    color: "#000",
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
    marginBottom: 20,
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
    position: "absolute",
    top: 5,
    right: 15,
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 25,
    },
  // Calculator Design
  inputCalculater: {
    borderColor: "#ccc",
    height: "85%",
    marginTop: 5,
    fontSize: 15,
    textAlign: "right",
    color: "#fff",
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
    marginBottom: 20,
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
  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  closeButtonLoan: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  buttonTextLoan: {
    textAlign: "center",
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
  },
  resultText: {
    color: "#fff",
    fontSize: 18,
  },
  modalContainerFullPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: "relative",
  },
  modalContentRate: {
    backgroundColor: "#000000",
    padding: 20,
    width: "90%",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#f8b400",
  },
});

export default InsertScreen;
