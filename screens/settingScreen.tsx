import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { themes } from "./themColor"; 
import * as MailComposer from 'expo-mail-composer';
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
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
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

  const handleSendEmail = async () => {
    const email = "jonasworker1861@gmail.com"; // Recipient's email

    // Set up the email content
    const options = {
      recipients: [email],
      subject: subject, // Subject of the email
      body: question,  // Body of the email (Question)
    };

    // Attempt to send the email
    const result = await MailComposer.composeAsync(options);

    if (result.status === 'sent') {
      console.log("Email sent successfully");
    } else {
      console.log("Failed to send email", result);
    }

    setModalVisible(false); // Close modal after sending
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={["rgba(2,0,36,1)", "rgba(14,14,113,1)", "rgba(0,212,255,1)"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
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

        {/* Settings Options */}
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text style={styles.logoutButtonText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.logoutButtonText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* Popup Message Modal */}
        <Modal visible={popupMessage} animationType="slide" transparent={true}>
          <View style={styles.modalContentPop}>
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
          </View>
        </Modal>

        {/* Email Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContentEmail}>
              <Text style={styles.modalTitle}>Send Email</Text>

              {/* Subject Input */}
              <TextInput
                style={styles.input}
                placeholder="Subject"
                value={subject}
                onChangeText={(text) => setSubject(text)}
              />

              {/* Question Input */}
              <TextInput
                style={[styles.input, styles.questionInput]}
                placeholder="Question"
                multiline
                numberOfLines={4}
                value={question}
                onChangeText={(text) => setQuestion(text)}
              />

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendEmail}
                >
                  <Text style={styles.buttonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        </LinearGradient>
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
  modalContentPop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: "#000000",
    width: "90%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#f8b400",
  },
  modalContentEmail: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  titleContent: {
    fontSize: 25,
    fontWeight: "bold",
    paddingBottom: 10,
    color: "#fff",
  },
  detailsContent: {
    fontSize: 20,
    paddingBottom: 10,
    color: "#fff",
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  questionInput: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  sendButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    width: "48%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 5,
    width: "48%",
    alignItems: "center",
  },
});

export default SettingsScreen;
