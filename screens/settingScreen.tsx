import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import Modal from "react-native-modal";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { themes } from "./themColor"; 
// Define the structure of the translations
type Language = "en" | "zh";
type TranslationKeys = "settingsScreen" | "logout" | "profile";

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

const SettingsScreen = ({ navigation }: any) => {
  const [language, setLanguage] = useState<Language>("en");
  const [popupMessage, setPopupMessage] = useState(false);
  const [popupMessageTitle, setPopupMessageTilte] = useState("");
  const [popupMessageDetails, setPopupMessageDetails] = useState("");
  const route = useRoute<RouteProp<RootParamList, "MainPage">>();
  const email = route.params?.email || "No email provided";
  // const [theme, setTheme] = useState<"black" | "white">("black");

  // const toggleTheme = () => {
  //   setTheme((prevTheme) => (prevTheme === "black" ? "white" : "black"));
  // };

  // const currentTheme = themes[theme];
  // Function to load the language from AsyncStorage
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

  // Load language when the component mounts
  useEffect(() => {
    loadLanguage();
  }, []);

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("sessionTimestamp");
      await AsyncStorage.removeItem("email");
      setPopupMessage(true);
      setPopupMessageTilte("Logged out");
      setPopupMessageDetails("You have been logged out successfully.");
    } catch (error) {
      setPopupMessage(true);
      setPopupMessageTilte("Error");
      setPopupMessageDetails("An error occurred while logging out.");
    }
  };

  // Function to update language and save it to AsyncStorage
  const changeLanguage = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    try {
      await AsyncStorage.setItem("language", newLanguage);
    } catch (error) {
      console.error("Failed to save language to AsyncStorage", error);
    }
  };

  const translate = (key: TranslationKeys): string => {
    return translations[language][key] || key;
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <View style={styles.languageButtonsContainer}>
        <TouchableOpacity
          style={[styles.languageButton]}
          onPress={() => changeLanguage("en")}
        >
          <Text style={[styles.languageButtonText]}>en</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => changeLanguage("zh")}
        >
          <Text style={[styles.languageButtonText]}>zh</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{translate("settingsScreen")}</Text>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => navigation.navigate("Profile", { email })}
      >
        <Text style={styles.logoutButtonText}>{translate("profile")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>{translate("logout")}</Text>
      </TouchableOpacity>

      <Modal isVisible={popupMessage}>
        <View style={styles.modalContent}>
          <Text style={styles.titleContent}>{popupMessageTitle}</Text>
          <Text style={styles.detailsContent}>{popupMessageDetails}</Text>
          <TouchableOpacity
            style={styles.butonDesign}
            onPress={() => {
              setPopupMessage(false);
              navigation.navigate("Login");
            }}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff"
  },
  languageButtonsContainer: {
    top: 0,
    right: 0,
    position: "absolute",
    flexDirection: "row",
    marginTop: 40,
    marginHorizontal: 10,
  },
  languageButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#f8b400',
  },
  languageButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  logoutButton: {
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f8b400',
  },
  logoutButtonText: {
    padding: 15,
    paddingHorizontal: 25,
    color: "#fff"
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  titleContent: {
    fontSize: 25,
    fontWeight: "bold",
    paddingBottom: 10,
  },
  detailsContent: {
    fontSize: 20,
    paddingBottom: 10,
  },
  butonDesign: {
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#f8b400',
  },
  buttonText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
});

export default SettingsScreen;
