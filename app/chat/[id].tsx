import { API_URL, SOCKET_URL } from '@/constants/Api';
import { getToken } from '@/lib/auth';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Platform,
  Alert
} from 'react-native';
import { Bubble, GiftedChat, IMessage, InputToolbar, Send } from 'react-native-gifted-chat';
import { io, Socket } from 'socket.io-client';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';

interface TokenPayload {
  id: string;
  name: string;
}

interface SocketMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

interface ExamRequestDetails {
  examName: string;
  examDate: string;
  subject: string;
  student: {
    id: string;
    name: string;
  };
  writer: {
    id: string;
    name: string;
  } | null;
}

export default function ChatScreen() {
  const { id: examRequestId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
  const [examRequest, setExamRequest] = useState<ExamRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useRef<Socket | null>(null);
  const router = useRouter();

  useEffect(() => {
    socket.current = io(SOCKET_URL);

    const getUserFromToken = async () => {
      const token = await getToken();
      if (token) {
        const decoded: TokenPayload = jwtDecode(token);
        setCurrentUser({ id: decoded.id, name: decoded.name });
      }
    };
    getUserFromToken();

    return () => {
      socket.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!examRequestId) return;

    const fetchExamDetails = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/exam-requests/${examRequestId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setExamRequest(data);
        } else {
          throw new Error('Failed to fetch exam details');
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load chat details');
      } finally {
        setLoading(false);
      }
    };
    fetchExamDetails();
  }, [examRequestId]);

  useEffect(() => {
    if (!examRequestId || !socket.current) return;

    const currentSocket = socket.current;

    currentSocket.emit('joinRoom', examRequestId);

    currentSocket.on('newMessage', (message: SocketMessage) => {
      const giftedMessage: IMessage = {
        _id: message.id,
        text: message.content,
        createdAt: new Date(message.createdAt),
        user: {
          _id: message.sender.id,
          name: message.sender.name,
        },
      };
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [giftedMessage]),
      );
    });

    const fetchMessages = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/exam-requests/${examRequestId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        const formattedMessages: IMessage[] = data.map((msg: any) => ({
          _id: msg.id,
          text: msg.content,
          createdAt: new Date(msg.createdAt),
          user: { _id: msg.sender.id, name: msg.sender.name },
        })).reverse();
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    return () => {
      currentSocket.off('newMessage');
    };
  }, [examRequestId, currentUser]);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    if (socket.current && currentUser) {
      const { _id, text, user } = newMessages[0];
      socket.current.emit('sendMessage', {
        examRequestId,
        senderId: currentUser.id,
        content: text,
      });
    }
  }, [examRequestId, currentUser]);

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#3B82F6',
            borderRadius: 20,
            borderBottomRightRadius: 4,
            marginVertical: 2,
          },
          left: {
            backgroundColor: '#F3F4F6',
            borderRadius: 20,
            borderBottomLeftRadius: 4,
            marginVertical: 2,
          },
        }}
        textStyle={{
          right: {
            color: '#FFFFFF',
            fontSize: 16,
          },
          left: {
            color: '#1F2937',
            fontSize: 16,
          },
        }}
        timeTextStyle={{
          right: {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          left: {
            color: '#6B7280',
          },
        }}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={styles.sendingContainer}>
          <Ionicons name="send" size={24} color="#3B82F6" />
        </View>
      </Send>
    );
  };

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  const getOtherUserName = () => {
    if (!examRequest || !currentUser) return 'Chat';
    
    if (currentUser.id === examRequest.student.id) {
      return examRequest.writer?.name || 'Writer';
    } else {
      return examRequest.student.name;
    }
  };

  if (!currentUser || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Custom Header */}
      <LinearGradient
        colors={['#3B82F6', '#1E40AF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getOtherUserName()}
            </Text>
            {examRequest && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {examRequest.examName} • {examRequest.subject}
              </Text>
            )}
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="videocam" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerActionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Chat Messages */}
      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={(messages) => onSend(messages)}
          user={{
            _id: currentUser.id,
            name: currentUser.name,
          }}
          renderBubble={renderBubble}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          placeholder="Type your message..."
          alwaysShowSend
          scrollToBottom
          scrollToBottomComponent={() => (
            <View style={styles.scrollToBottomButton}>
              <Ionicons name="chevron-down" size={20} color="#3B82F6" />
            </View>
          )}
          messagesContainerStyle={styles.messagesContainer}
          bottomOffset={Platform.OS === 'ios' ? 34 : 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContainer: {
    backgroundColor: '#FFFFFF',
  },
  inputToolbar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 60,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  sendingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  scrollToBottomButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});