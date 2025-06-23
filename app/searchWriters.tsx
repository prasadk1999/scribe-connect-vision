import { API_URL } from '@/constants/Api';
import { getToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { 
  Alert, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function SearchWriters() {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [duration, setDuration] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateRequest = async () => {
    if (!examName.trim() || !examDate.trim() || !duration.trim() || !subject.trim()) {
      Alert.alert('Missing Information', 'Please fill out all fields.');
      return;
    }

    // Basic date validation
    const selectedDate = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Please select a future date for your exam.');
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
          examName: examName.trim(),
          examDate,
          duration: duration.trim(),
          subject: subject.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }

      Alert.alert(
        'Request Submitted', 
        'Your exam request has been sent to all available writers. You will be notified when a writer accepts your request.',
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#F59E0B', '#D97706', '#B45309']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={FadeInUp.delay(200).duration(1000)}
              style={styles.headerContainer}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔍</Text>
              </View>
              <Text style={styles.title}>Find a Writer</Text>
              <Text style={styles.subtitle}>
                Create an exam request and connect with qualified writers
              </Text>
            </Animated.View>

            <Animated.View 
              entering={FadeInDown.delay(400).duration(1000)}
              style={styles.formContainer}
            >
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Exam Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Final History Paper, Math Midterm"
                  placeholderTextColor="#94A3B8"
                  value={examName}
                  onChangeText={setExamName}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Mathematics, History, Biology"
                  placeholderTextColor="#94A3B8"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Exam Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD (e.g., 2024-12-15)"
                  placeholderTextColor="#94A3B8"
                  value={examDate}
                  onChangeText={setExamDate}
                />
                <Text style={styles.inputHint}>
                  Please use the format: YYYY-MM-DD
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Duration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2 hours, 3.5 hours, 90 minutes"
                  placeholderTextColor="#94A3B8"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={styles.infoText}>
                  Your request will be sent to all available writers. You'll be notified when someone accepts your request.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleCreateRequest}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Submitting Request...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
  },
});