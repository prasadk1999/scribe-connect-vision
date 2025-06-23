import { API_URL } from '@/constants/Api';
import { getToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SearchWriters() {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [duration, setDuration] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateRequest = async () => {
    if (!examName || !examDate || !duration || !subject) {
      Alert.alert('Missing Information', 'Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/exam-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          examName,
          examDate,
          duration,
          subject,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }

      Alert.alert('Request Submitted', 'Your exam request has been sent out to all available writers.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a Writer</Text>
      <Text style={styles.subtitle}>Your request will be sent to all available writers.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Exam Name (e.g., Final History Paper)"
        value={examName}
        onChangeText={setExamName}
      />
      <TextInput
        style={styles.input}
        placeholder="Exam Date (e.g., YYYY-MM-DD)"
        value={examDate}
        onChangeText={setExamDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Duration (e.g., 2 hours)"
        value={duration}
        onChangeText={setDuration}
      />
      <TextInput
        style={styles.input}
        placeholder="Subject (e.g., Mathematics)"
        value={subject}
        onChangeText={setSubject}
      />
      
      <Button title={loading ? 'Submitting...' : 'Submit Request'} onPress={handleCreateRequest} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
}); 