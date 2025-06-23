import { API_URL } from '@/constants/Api';
import { saveToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

// This is a polyfill for atob
const atob = (input: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 == 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }

    for (
        let bc = 0, bs = 0, buffer, i = 0;
        buffer = str.charAt(i++);
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ?
        (output += String.fromCharCode(255 & bs >> (-2 * bc & 6))) : 0
    ) {
        buffer = chars.indexOf(buffer);
    }

    return output;
};

// Polyfill atob if it's not available
if (typeof global.atob === 'undefined') {
  global.atob = atob;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok) {
        const token = data.token;
        console.log("Token:", token);
        await saveToken(token);
        console.log("Set secure token");
        const decodedToken: { userId: string, userType: string } = jwtDecode(token);
        console.log("Decoded token:", decodedToken);
        const { userType } = decodedToken;

        if (userType === 'student') {
          router.replace('/(tabs)/studentDashboard');
        } else if (userType === 'writer') {
          router.replace('/(tabs)/writerDashboard');
        } else {
            // Handle other roles or default case
            router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login Error', 'An error occurred during login.');
    }
  };

  const goToRegister = () => {
    router.push('/register');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScribeConnect</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Don't have an account? Register" onPress={goToRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
}); 