import { API_URL, SOCKET_URL } from '@/constants/Api';
import { getToken } from '@/lib/auth';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bubble, GiftedChat, IMessage, InputToolbar, Send } from 'react-native-gifted-chat';
import { io, Socket } from 'socket.io-client';

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
}

export default function ChatScreen() {
  const { id: examRequestId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
  const [examRequest, setExamRequest] = useState<ExamRequestDetails | null>(null);
  const socket = useRef<Socket | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize and connect the socket when the component mounts
    socket.current = io(SOCKET_URL);

    // Decode the token to get the current user's ID and name
    const getUserFromToken = async () => {
      const token = await getToken();
      if (token) {
        const decoded: TokenPayload = jwtDecode(token);
        setCurrentUser({ id: decoded.id, name: decoded.name });
      }
    };
    getUserFromToken();

    // Disconnect the socket when the component unmounts
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
      }
    };
    fetchExamDetails();
  }, [examRequestId]);

  useEffect(() => {
    if (!examRequestId || !socket.current) return;

    const currentSocket = socket.current;

    // Join the chat room
    currentSocket.emit('joinRoom', examRequestId);

    // Listen for new messages
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

    // Fetch initial messages
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
        })).reverse(); // GiftedChat expects messages to be in descending order
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
            backgroundColor: '#007AFF', // Blue for sender
          },
          left: {
            backgroundColor: '#E5E5EA', // Gray for receiver
          },
        }}
        textStyle={{
          right: {
            color: '#fff',
          },
          left: {
            color: '#000',
          },
        }}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={styles.sendingContainer}>
          <FontAwesome name="send" size={24} color="#007AFF" />
        </View>
      </Send>
    );
  };

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={{ alignItems: 'center' }}
      />
    );
  };

  if (!currentUser) {
    return null; // Or a loading indicator
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {examRequest?.examName || 'Chat'}
          </Text>
          {examRequest && (
            <Text style={styles.headerSubtitle}>
              {new Date(examRequest.examDate).toLocaleDateString()}
            </Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>
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
        placeholder="Type your message here..."
        alwaysShowSend
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'gray',
  },
  headerRight: {
    width: 34, // To balance the back button
  },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#fff',
    padding: 5,
  },
  sendingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 5,
  },
}); 