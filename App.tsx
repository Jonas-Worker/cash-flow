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
// import * as Notifications from 'expo-notifications';

const Stack = createStackNavigator();
type Language = "en" | "zh";
type TranslationKeys = "settingsScreen" | "logout" | "login" | "profile" | "register";

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

  // useEffect(() => {
  //   const setupNotifications = async () => {
  //     // 配置 Android 通知频道
  //     if (Platform.OS === 'android') {
  //       await Notifications.setNotificationChannelAsync('default', {
  //         name: 'Default',
  //         importance: Notifications.AndroidImportance.HIGH,
  //         sound: 'default',
  //         vibrationPattern: [0, 250, 250, 250],
  //         lightColor: '#FF231F7C',
  //       });
  //     }

  //     // 请求通知权限
  //     const { status } = await Notifications.requestPermissionsAsync();

  //     if (status !== 'granted') {
  //       return;
  //     }

  //     // 调度通知
  //     await Notifications.scheduleNotificationAsync({
  //       content: {
  //         title: '今天还没记账喔～',
  //         body: '记录今天的第一笔账',
  //         sound: 'default',
  //         sticky: false, 
  //       },
  //       trigger: {
  //         second: 60,
  //         repeats: false,
  //       },
  //     });

  //   };

  //   setupNotifications();

  //   // 添加通知监听器
  //   const subscription = Notifications.addNotificationReceivedListener(notification => {
  //     const { title, body, data } = notification.request.content;
    
  //     console.log('Notification received!');
  //     console.log('Title:', title);
  //     console.log('Body:', body);
  //     console.log('Data:', data);
    
  //   });
    
  //   const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
  //     const { actionIdentifier, notification } = response;
  //     const { title, body, data } = notification.request.content;

  //     console.log('Notification clicked!');
  //     console.log('Action Identifier:', actionIdentifier);
  //     console.log('Title:', title);
  //     console.log('Body:', body);
  //     console.log('Data:', data);

  //     if (data && data.targetScreen) {
  //       console.log('Navigating to:', data.targetScreen);
  //     }
  //   });
  //   return () => {
  //     subscription.remove();
  //     responseListener.remove();
  //   };
  // }, []);

  return (
    <>
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
