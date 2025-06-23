import { API_URL, SOCKET_URL } from '@/constants/Api';
import { deleteToken, getToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { io } from 'socket.io-client';

interface ExamRequest {
  id: string;
  examName: string;
  subject: string;
  examDate: string;
  duration: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  student: {
    name: string;
    email: string;
  };
  writerId?: string | null;
}

const socket = io(SOCKET_URL, {
  autoConnect: false, // Do not connect automatically
  transports: ['websocket'],
});

export default function WriterDashboard() {
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
    setLoading(true); // Set loading to true when starting a fetch
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/exam-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },method:'GET',
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
      console.log("Writer Dashboard data:", data);
      setRequests(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not fetch requests.');
    } finally {
      setLoading(false); // Always set loading to false after the fetch attempt
    }
  }, [router]);

  useEffect(() => {
    fetchRequests();

    // Connect and set up listeners
    socket.connect();
    socket.on('connect', () => {
      console.log('Socket connected on Writer Dashboard');
    });

    socket.on('new-exam-request', (newRequest: ExamRequest) => {
      console.log('Received new exam request:', newRequest);
      setRequests(prevRequests => {
        if (prevRequests.find(req => req.id === newRequest.id)) {
          return prevRequests;
        }
        if (newRequest.status === 'PENDING' && !newRequest.writerId) {
          return [newRequest, ...prevRequests];
        }
        return prevRequests;
      });
    });

    // Listen for updates when a request is accepted/rejected
    socket.on('exam-request-updated', (updatedRequest: ExamRequest) => {
      console.log('Received request update:', updatedRequest);
      // Remove the request from the list if it's no longer pending
      if (updatedRequest.status !== 'PENDING') {
        setRequests(prevRequests => prevRequests.filter(req => req.id !== updatedRequest.id));
      }
    });

    // Clean up on component unmount
    return () => {
      console.log('Disconnecting socket on Writer Dashboard');
      socket.off('connect');
      socket.off('new-exam-request');
      socket.off('exam-request-updated');
      socket.disconnect();
    };
  }, [fetchRequests]);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/exam-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} request`);
      }
      
      // The socket event `exam-request-updated` will handle removing the item from the list.
      Alert.alert('Success', `Request has been ${action}ed.`);

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = async () => {
    await deleteToken();
    socket.disconnect(); // Also disconnect socket on logout
    router.replace('/');
  };

  const renderRequest = ({ item }: { item: ExamRequest }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestName}>{item.examName} ({item.subject})</Text>
      <Text>From: {item.student.name} ({item.student.email})</Text>
      <Text>Date: {new Date(item.examDate).toLocaleDateString()}</Text>
      <Text>Status: {item.status}</Text>
      {item.status === 'PENDING' && (
        <View style={styles.buttonContainer}>
          <Button title="Accept" onPress={() => handleAction(item.id, 'accept')} />
          <View style={{ width: 10 }} />
          <Button title="Reject" onPress={() => handleAction(item.id, 'reject')} color="red" />
        </View>
      )}
      {item.status === 'ACCEPTED' && (
        <View style={styles.buttonContainer}>
          <Button title="Chat with Student" onPress={() => router.push(`/chat/${item.id}`)} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Writer Dashboard</Text>
      {loading ? (
        <Text>Loading requests...</Text>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No requests found.</Text>}
          refreshing={loading}
          onRefresh={fetchRequests}
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
    requestItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    requestName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    footer: {
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
}); 