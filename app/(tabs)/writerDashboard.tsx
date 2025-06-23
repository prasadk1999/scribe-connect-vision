import { API_URL, SOCKET_URL } from '@/constants/Api';
import { deleteToken, getToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { 
  Alert, 
  FlatList, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { io } from 'socket.io-client';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';

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
  autoConnect: false,
  transports: ['websocket'],
});

const { width } = Dimensions.get('window');

export default function WriterDashboard() {
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/exam-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        method: 'GET',
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
      console.error(error);
      Alert.alert('Error', 'Could not fetch requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRequests();

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

    socket.on('exam-request-updated', (updatedRequest: ExamRequest) => {
      console.log('Received request update:', updatedRequest);
      if (updatedRequest.status !== 'PENDING') {
        setRequests(prevRequests => prevRequests.filter(req => req.id !== updatedRequest.id));
      }
    });

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
      
      Alert.alert('Success', `Request has been ${action}ed.`);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await deleteToken();
            socket.disconnect();
            router.replace('/');
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [fetchRequests]);

  const renderRequest = ({ item, index }: { item: ExamRequest; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).duration(600)}
      style={styles.requestCard}
    >
      <BlurView intensity={20} style={styles.cardBlur}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.requestName} numberOfLines={2}>
              {item.examName}
            </Text>
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{item.subject}</Text>
            </View>
          </View>
          
          <View style={styles.studentInfo}>
            <Text style={styles.studentLabel}>Student:</Text>
            <Text style={styles.studentName}>{item.student.name}</Text>
          </View>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📅 Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(item.examDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>⏱️ Duration:</Text>
              <Text style={styles.detailValue}>{item.duration}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>✉️ Email:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.student.email}
              </Text>
            </View>
          </View>

          {item.status === 'PENDING' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => handleAction(item.id, 'accept')}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => handleAction(item.id, 'reject')}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'ACCEPTED' && (
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.chatButtonText}>Start Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );

  const EmptyState = () => (
    <Animated.View 
      entering={FadeInUp.delay(300).duration(800)}
      style={styles.emptyState}
    >
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>✍️</Text>
      </View>
      <Text style={styles.emptyTitle}>No Requests Available</Text>
      <Text style={styles.emptySubtitle}>
        New exam requests from students will appear here
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Animated.View 
            entering={FadeInDown.delay(200).duration(800)}
            style={styles.headerContent}
          >
            <Text style={styles.headerTitle}>Writer Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Available exam writing opportunities
            </Text>
          </Animated.View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={EmptyState}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#FFFFFF"
                  colors={['#10B981']}
                />
              }
              contentContainerStyle={[
                styles.listContent,
                requests.length === 0 && styles.listContentEmpty
              ]}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerContent: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  requestCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  subjectBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  studentLabel: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    marginRight: 8,
  },
  studentName: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '700',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});