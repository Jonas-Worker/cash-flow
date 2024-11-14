import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
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
      // Session expired or not found, stay on the login screen
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
    <View style={styles.loginContainer}>
      <View style={styles.container}>
        <Text style={styles.loginTitle}>Login</Text>
        <View style={styles.bodyContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={username}
            onChangeText={setUsername}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNavigation}>
            <Text>
              Don't have an account?{" "}
              <Text style={styles.registerText}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#fce9db",
  },
  container: {
    backgroundColor: "#FFFFFF",
    display: "flex",
    paddingTop: 30,
    paddingBottom: 10,
    marginHorizontal: 10,
  },
  loginTitle: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    paddingBottom: 10,
  },
  bodyContainer: {
    paddingHorizontal: 10,
    position: "relative",
  },
  input: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 15,
    paddingHorizontal: 5,
    fontSize: 16,
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
});

export default LoginScreen;
