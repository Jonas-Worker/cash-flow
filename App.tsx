import 'react-native-gesture-handler';
import React, { useState, useEffect } from "react";
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/loginScreen';
import InsertScreen from './screens/insertScreen';
import DisplayScreen from './screens/displayScreen';
import MainScreen from './screens/mainScreen';
import ProfileScreen from './screens/profileScreen';
import SettingsScreen from './screens/settingScreen';
import RegisterScreen from './screens/registerScreen';
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "./translations.json";
import Modal from "react-native-modal";
import { opacity } from 'react-native-reanimated/lib/typescript/Colors';

const Stack = createStackNavigator();
type Language = "en" | "zh";
type TranslationKeys = "settingsScreen" | "logout";
const App = () => {
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
  }, [AsyncStorage]);
  return (
    <>
      {/* Set the StatusBar to ensure it's visible and properly styled */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={false} />
      
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Insert" 
            component={InsertScreen} 
            options={{
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen 
            name="Record" 
            component={DisplayScreen} 
            options={{
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen 
            name="MainPage" 
            component={MainScreen} 
            options={{
              headerShown: false,
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{
              headerTitleAlign: 'center',
              headerTransparent: true,
            }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{
              headerTitleAlign: 'center',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;