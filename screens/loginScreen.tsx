import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../supabaseClient";

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Check if the user has a valid session
    const checkSession = async () => {
      const sessionTimestamp = await AsyncStorage.getItem("sessionTimestamp");
      if (sessionTimestamp) {
        const sessionDate = new Date(parseInt(sessionTimestamp));
        const currentDate = new Date();
        const differenceInDays = Math.floor(
          (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (differenceInDays < 30) {
          // Session is still valid, navigate to the main page
          const email = await AsyncStorage.getItem("email");
          navigation.navigate("MainPage", { email });
          return;
        }
      }
    };

    checkSession();
  }, [navigation]);

  const handleLogin = async () => {
    const { data, error } = await supabase
      .from("custom_users")
      .select("*")
      .eq("email", username)
      .eq("password", password)
      .single();

    if (error) {
      Alert.alert("Error", "Incorrect email and password.");
    } else {
      // Save the session timestamp and email to AsyncStorage
      const timestamp = Date.now();
      await AsyncStorage.setItem("sessionTimestamp", timestamp.toString());
      await AsyncStorage.setItem("email", data.email);
      navigation.navigate("MainPage", { email: data.email });
    }
  };

  const handleNavigation = () => {
    navigation.navigate("Register");
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <View style={styles.container}>
        <Text style={styles.loginTitle}>Login</Text>
        <View style={styles.bodyContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={username}
            onChangeText={setUsername}
            keyboardType="email-address"
            placeholderTextColor="#fff"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#fff"
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNavigation}>
            <Text style={styles.textResgiter}>
              Don't have an account?{" "}
              <Text style={styles.registerText}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#000",
  },
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    display: "flex",
    paddingTop: 30,
    paddingBottom: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: "#f8b400",
    borderRadius: 20,
  },
  loginTitle: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    paddingBottom: 10,
    color: "#fff",
  },
  bodyContainer: {
    paddingHorizontal: 10,
    position: "relative",
  },
  input: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    marginBottom: 15,
    paddingHorizontal: 5,
    fontSize: 16,
    color: "#fff",
  },
  button: {
    backgroundColor: "#00BFFF",
    position: "relative",
    paddingVertical: 10,
    borderRadius: 5,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    width: "40%",
    alignSelf: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerText: {
    color: "red",
    fontWeight: "bold",
  },
  textResgiter: {
    color: "#fff"
  }
});

export default LoginScreen;
