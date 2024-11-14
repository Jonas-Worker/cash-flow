import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";
import supabase from "../supabaseClient";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../translations.json";

type Language = "en" | "zh";
type TranslationKeys = "email" | "profile" | "phoneNumber" | "password" | "updateProfile";
interface Profile {
  id: number;
  email: string;
  password: string;
  phone_number: string;
}

type RootParamList = {
  MainPage: { email: string };
  Profile: { email: string };
  Record: { email: string };
  Insert: { email: string };
  Settings: undefined;
};

const translate = (key: TranslationKeys, language: Language, params?: any): string => {
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

const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState(false);
  const [popupMessageTitle, setPopupMessageTilte] = useState("");
  const [popupMessageDetails, setPopupMessageDetails] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const route = useRoute<RouteProp<RootParamList, "Record">>();
  const email = route.params?.email || "No email provided";
  const [language, setLanguage] = useState<Language>("en");
  const [emails, setEmail] = useState<string>(""); 

  useEffect(() => {
    // Retrieve email from AsyncStorage or other source
    AsyncStorage.getItem("email").then((storedEmail) => {
      if (storedEmail) setEmail(storedEmail);
    });
  
    // Optionally, get language preference from AsyncStorage
    AsyncStorage.getItem("language").then((storedLang) => {
      if (storedLang && (storedLang === "en" || storedLang === "zh")) {
        setLanguage(storedLang as Language);
      }
    });
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("custom_users")
        .select("*")
        .eq("email", email);

      if (error) {
        console.error(error);
      } else if (data && data.length > 0) {
        setProfile(data);
        setPhoneNumber(data[0].phone_number);
        setPassword(data[0].password);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [email]);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("custom_users")
      .update({ phone_number: phoneNumber, password })
      .eq("email", email);

    if (error) {
      Alert.alert("Update Failed", "There was an error updating your profile.");
      console.error(error);
    } else {
      setPopupMessage(true);
      setPopupMessageTilte("Success");
      setPopupMessageDetails("Your profile has been updated.");
    }
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <View style={styles.item}>
      <Text style={styles.text}>{translate("email", language)}</Text>
      <TextInput style={styles.input} value={item.email} editable={false} />
      <Text style={styles.text}>{translate("phoneNumber", language)}</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Phone Number"
        keyboardType="phone-pad"
      />
      <Text style={styles.text}>{translate("password", language)}</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
        <TouchableOpacity
            style={styles.butonDesign}
            onPress={() => handleUpdate()}
          >
            <Text style={styles.buttonText}>{translate("updateProfile", language)}</Text>
          </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.bodyContainer}>
      <View style={styles.container}>
        <Text style={styles.profileTitle}>{translate("profile", language)}</Text>
      <FlatList
        data={profile}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
      <Modal isVisible={popupMessage}>
        <View style={styles.modalContent}>
          <Text style={styles.titleContent}>{popupMessageTitle}</Text>
          <Text style={styles.detailsContent}>{popupMessageDetails}</Text>
          <TouchableOpacity
            style={styles.butonDesign}
            onPress={() => setPopupMessage(false)}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
    </View>
    
  );
};

const styles = StyleSheet.create({
  bodyContainer:{
    flex: 1,
    justifyContent:'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#fce9db',
  },
  container: {
    position: 'absolute',
    flex: 1,
    width: '100%',
    paddingHorizontal: 10, 
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  profileTitle:{
    fontSize: 25,
    fontWeight: 'bold',
    flex: 1,
    textAlign:'center',
    paddingBottom: 10,
  },
  item: {
    display: 'flex',
    justifyContent: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    height: 50,
    fontSize: 15,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
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
    backgroundColor: '#00BFFF',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export default ProfileScreen;
