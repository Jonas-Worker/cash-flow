import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack'; // Import StackNavigationProp from react-navigation
import supabase from '../supabaseClient';

const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [error, setError] = useState('');
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const handleRegister = async () => {
    if (!email || !password || !repassword) {
        setError('All fields are required.');
        return;
      }
      else if(password.length < 8){
        Alert.alert('Error', 'Password must at least 8 character');
      }
      else if(repassword != password){
        Alert.alert('Error', 'Re-password must be same like password.');
        return;
      }
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please make sure the email format is correct, e.g., example@gmail.com');
          return;
      }
    
      try {
        const { data, error } = await supabase
          .from('custom_users') 
          .insert([
            { 
                email: email,
                password: password,
            }
          ]);
    
        if (error) {
          Alert.alert('Error', 'Error inserting data:'+ error.message);
        } else {
          Alert.alert('Success', 'Success register account. Welcome');
          navigation.goBack();
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'An error occurred while submitting the data');
      }
    };

  return (
    <View style = {styles.container}>
      <TextInput
        placeholder="Email(example@gmail.com)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        placeholder="Re-password"
        secureTextEntry
        value={repassword}
        onChangeText={setRepassword}
        />
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
};
const styles = StyleSheet.create({
    container:{
        display: 'flex',
        paddingBottom: 10,
        marginLeft: 10,
        marginRight: 10,
    }
}) 

export default RegisterScreen;
