import 'react-native-gesture-handler';
import React, { useState, useEffect } from "react";
import { StatusBar, Platform } from 'react-native';
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
import * as Notifications from 'expo-notifications';

const Stack = createStackNavigator();
type Language = "en" | "zh";
type TranslationKeys = "settingsScreen" | "logout" | "login" | "report" | "profile" | "register";

const App = () => {
  const [language, setLanguage] = useState<Language>("en");
  const [emails, setEmail] = useState<string>(""); 
  const translate = (key: TranslationKeys): string => {
    return translations[language][key] || key;
  };

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
    // Request permission to show push notifications
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission not granted for notifications');
      }
    };

    requestPermissions();

    // Listen for notifications in the foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle the notification here, navigate or show modal
    });

    // Listen for response to notifications (when the user taps on a notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
    });

    // Cleanup listeners when the component unmounts
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // This function triggers a local notification every 10 seconds
  const triggerNotification = () => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: '今天还没记账喔～',
        body: '记录今天的第一笔账',
        sound: true,
        vibrate: [0, 250, 250, 250],  // Vibrate pattern (in milliseconds)
      },
      trigger: {
        seconds: 10,  // Trigger the notification every 10 seconds
        repeats: true,  // Make the notification repeat
      } as Notifications.TimeIntervalTriggerInput,  // Explicitly cast to TimeIntervalTriggerInput
    });
  };

  useEffect(() => {
    // Start sending notifications every 10 seconds when the app starts
    const interval = setInterval(() => {
      triggerNotification();
    }, 10000);  // 10000 ms = 10 seconds

    // Cleanup interval when the component unmounts
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Set the StatusBar to ensure it's visible and properly styled */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={false} />
      
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen 
            name={translate("login")}
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
            name={translate("report")}
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
            name={translate("profile")}
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
              headerTitleStyle: {
                color: 'white', 
              },
              headerTintColor: 'white',
            }}
          />
          <Stack.Screen 
            name={translate("register")}
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
