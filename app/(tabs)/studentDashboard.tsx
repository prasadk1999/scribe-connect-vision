import { API_URL } from '@/constants/Api';
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';

interface ExamRequest {
  id: string;
  examName: string;
  status: string;
  writer: {
    name: string;
  } | null;
  examDate: string;
  subject: string;
  duration: string;
}

const { width } = Dimensions.get('window');

export default function StudentDashboard() {
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
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
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'completed': return '#6366F1';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#FEF3C7';
      case 'accepted': return '#D1FAE5';
      case 'completed': return '#E0E7FF';
      default: return '#F3F4F6';
    }
  };

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
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusBgColor(item.status) }
            ]}>
              <Text style={[
                styles.statusText, 
                { color: getStatusColor(item.status) }
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(item.examDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{item.duration}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subject:</Text>
              <Text style={styles.detailValue}>{item.subject}</Text>
            </View>
            {item.writer && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Writer:</Text>
                <Text style={styles.detailValue}>{item.writer.name}</Text>
              </View>
            )}
          </View>

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
        <Text style={styles.emptyIcon}>📚</Text>
      </View>
      <Text style={styles.emptyTitle}>No Exam Requests Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first exam request to get started with finding a writer
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#3B82F6', '#1E40AF', '#1E3A8A']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Animated.View 
            entering={FadeInDown.delay(200).duration(800)}
            style={styles.headerContent}
          >
            <Text style={styles.headerTitle}>My Exam Requests</Text>
            <Text style={styles.headerSubtitle}>
              Manage your exam writing requests
            </Text>
          </Animated.View>
          
          <Animated.View 
            entering={FadeInDown.delay(400).duration(800)}
            style={styles.headerActions}
          >
            <TouchableOpacity 
              style={styles.newRequestButton}
              onPress={() => router.push('/searchWriters')}
              activeOpacity={0.8}
            >
              <Text style={styles.newRequestButtonText}>+ New Request</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading your requests...</Text>
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
                  colors={['#3B82F6']}
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
  headerActions: {
    alignItems: 'flex-end',
  },
  newRequestButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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