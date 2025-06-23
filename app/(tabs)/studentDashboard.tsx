import { API_URL } from '@/constants/Api';
import { deleteToken, getToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';

interface ExamRequest {
  id: string;
  examName: string;
  status: string;
  writer: {
    name: string;
  } | null;
  examDate: string;
}

export default function StudentDashboard() {
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/exam-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await deleteToken();
        router.replace('/');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Error', `Could not load requests: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleLogout = async () => {
    await deleteToken();
    router.replace('/');
  };

  const renderRequest = ({ item }: { item: ExamRequest }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestName}>{item.examName}</Text>
      <Text>Date: {new Date(item.examDate).toLocaleDateString()}</Text>
      <Text>Status: {item.status}</Text>
      {item.writer && <Text>Writer: {item.writer.name}</Text>}
      {item.status === 'ACCEPTED' && (
        <View style={styles.buttonContainer}>
          <Button title="Chat with Writer" onPress={() => router.push(`/chat/${item.id}`)} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Exam Requests</Text>
      <Button title="Find a Writer for a New Exam" onPress={() => router.push('/searchWriters')} />
      
      {loading ? (
        <Text style={styles.loadingText}>Loading requests...</Text>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>You have no exam requests.</Text>}
          onRefresh={fetchRequests}
          refreshing={loading}
          style={styles.list}
        />
      )}

      <View style={styles.footer}>
        <Button title="Logout" onPress={handleLogout} color="#c0392b" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
    },
    list: {
        marginTop: 20,
    },
    requestItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    requestName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: 'gray',
    },
    footer: {
        marginTop: 20,
    },
    buttonContainer: {
        marginTop: 10,
    },
}); 