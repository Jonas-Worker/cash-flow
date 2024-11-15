import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  const [remarkCategory, setRemarkCategory] = useState<"Income" | "Expenses">(
    "Income"
  );
  const [remarkSubCategory, setRemarkSubCategory] = useState("");
  const [error, setError] = useState("");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const route = useRoute<RouteProp<RootParamList, "Insert">>();
  const email = route.params?.email || "No email provided";
  const [language, setLanguage] = useState<Language>("en");

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
      const totalCashOut = cashFlows.reduce((acc, item) => acc + parseFloat(item.cash_out), 0);
  
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
    translate("stock"),
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
    <View style={styles.bodyInsertContainer}>
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
        </View>
        <Text>{translate("amount")}:</Text>
        <TextInput
          placeholder={
            remarkCategory === "Income"
              ? translate("amount")+" (Income)"
              : translate("amount")+" (Expenses)"
          }
          value={remarkCategory === "Income" ? cashIn : cashOut}
          onChangeText={remarkCategory === "Income" ? setCashIn : setCashOut}
          keyboardType="numeric"
          style={styles.input}
        />
        <Text>{translate("date")}:</Text>
        <TouchableOpacity
          style={styles.inputDate}
          onPress={() => setDatePickerVisibility(true)}
        >
          <Text>{date ? date : translate("selectDate")}</Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
        />
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
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("stock") && (
                <Icon
                  name="bar-chart"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("reward") && (
                <Icon
                  name="credit-card"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("saving") && (
                <Icon
                  name="bank"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("gift") && (
                <Icon
                  name="gift"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("inves") && (
                <Icon
                  name="line-chart"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("food") && (
                <Icon
                  name="cutlery"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("transport") && (
                <Icon
                  name="car"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("rent") && (
                <Icon
                  name="home"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("play") && (
                <Icon
                  name="gamepad"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("health") && (
                <Icon
                  name="heartbeat"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              {category === translate("study") && (
                <Icon
                  name="book"
                  size={20}
                  color="#ff6f61"
                  style={styles.icon}
                />
              )}
              <Text style={styles.buttonTextCategory}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text>{translate("remark")}:</Text>
        <TextInput
          placeholder={translate("remark")}
          style={styles.input}
          value={remark}
          onChangeText={setRemark}
        ></TextInput>

        <TouchableOpacity onPress={handleSubmit} style={styles.buttonSubmit}>
          <Text style={styles.buttonText}>{translate("submit")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bodyInsertContainer: {
    flex: 1,
    backgroundColor: "#fce9db",
  },
  container: {
    display: "flex",
    marginHorizontal: 10,
    marginTop: 20,
  },
  categoryButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  button: {
    padding: 10,
    backgroundColor: "#d3d3d3",
    borderRadius: 15,
    width: "45%",
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "#ff6f61",
  },
  buttonText: {
    color: "#fff",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
  inputDate: {
    marginBottom: 10,
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
    backgroundColor: "#fad3a5",
    borderRadius: 15,
    marginBottom: 10,
    marginRight: "3%",
    marginLeft: "3%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonTextCategory: {
    color: "#ff6f61",
    fontSize: 14,
  },
  selectedSubCategory: {
    backgroundColor: "#4CAF50",
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
    padding: 10,
    backgroundColor: "#ff6f61",
    borderRadius: 15,
    width: "45%",
    alignItems: "center",
    alignSelf: "center",
  },
});

export default InsertScreen;
