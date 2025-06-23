import { API_URL } from '@/constants/Api';
import { getToken, saveToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

interface TokenPayload {
  id: string;
  name: string;
  userType: 'STUDENT' | 'WRITER';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkTokenAndRedirect = async () => {
      const token = await getToken();
      if (token) {
        try {
          const decoded: TokenPayload = jwtDecode(token);
          const userType = decoded.userType?.toUpperCase();
          if (userType === 'STUDENT') {
            router.replace('/studentDashboard');
          } else if (userType === 'WRITER') {
            router.replace('/writerDashboard');
          }
        } catch (e) {
          console.error("Invalid token:", e);
        }
      }
    };
    checkTokenAndRedirect();
  }, []);

  const onLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        await saveToken(data.token);
        // Manually trigger the redirect after successful login
        const decoded: TokenPayload = jwtDecode(data.token);
        const userType = decoded.userType?.toUpperCase();
        if (userType === 'STUDENT') {
          router.replace('/studentDashboard');
        } else if (userType === 'WRITER') {
          router.replace('/writerDashboard');
        }
      } else {
        Alert.alert('Login Failed', data.error || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Login Error', 'An error occurred during login.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={onLogin} />
      <View style={styles.separator} />
      <Button title="Don't have an account? Register" onPress={() => router.push('/register')} />
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
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  separator: {
    marginVertical: 12,
  },
});
