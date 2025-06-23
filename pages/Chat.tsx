import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { socket, connectSocket, disconnectSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { Phone } from "lucide-react";
import VideoCall from "@/components/VideoCall";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  examRequestId: string;
  sender: {
    id: string;
    name: string;
    userType: string;
  };
}

interface ExamRequest {
  id: string;
  examName: string;
  student: {
    id: string;
    name: string;
  };
  writer: {
    id: string;
    name: string;
  } | null;
  messages: Message[];
}

interface UserData {
  id: string;
  name: string;
  userType: string;
}

const Chat = () => {
  const { requestId: urlRequestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ExamRequest | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const storedUserData = localStorage.getItem('userData');
    const storedRequestId = localStorage.getItem('currentChatRequestId');
    
    if (!token || !storedUserData) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the chat",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    // Use the requestId from URL params or fallback to stored requestId
    const requestId = urlRequestId || storedRequestId;
    console.log("Chat component - RequestId:", requestId);
    setCurrentRequestId(requestId);

    if (!requestId) {
      toast({
        title: "Error",
        description: "Invalid chat request",
        variant: "destructive"
      });
      navigate('/writer-dashboard');
      return;
    }

    const parsedUserData = JSON.parse(storedUserData);
    setUserData(parsedUserData);

    // Connect to socket if not already connected
    if (!socket.connected) {
      connectSocket(parsedUserData.id);
    }

    const fetchRequest = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/exam-requests/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          localStorage.removeItem('currentChatRequestId');
          toast({
            title: "Session Expired",
            description: "Please log in again",
            variant: "destructive"
          });
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch request');
        }

        const data = await response.json();
        setRequest(data);
      } catch (error) {
        console.error('Error fetching request:', error);
        toast({
          title: "Error",
          description: "Failed to load chat. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();

    // Set up socket listeners
    const handleNewMessage = (newMessage: Message) => {
      console.log('Received new message:', newMessage);
      if (newMessage.examRequestId === requestId) {
        setRequest(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, newMessage]
          };
        });
      }
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
      // Don't disconnect socket here as it might be needed for other components
    };
  }, [urlRequestId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [request?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentRequestId || !userData) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send messages",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message,
          examRequestId: currentRequestId
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('currentChatRequestId');
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const sentMessage = await response.json();
      console.log('Message sent successfully:', sentMessage);
      
      // Update local state with the sent message
      setRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, sentMessage]
        };
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleStartCall = () => {
    setShowVideoCall(true);
  };

  const handleEndCall = () => {
    setShowVideoCall(false);
  };

  if (!userData) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">Chat not found</p>
        </div>
      </div>
    );
  }

  // Verify user has access to this chat
  if (request.student.id !== userData.id && request.writer?.id !== userData.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">You don't have access to this chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Chat for {request.examName}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="h-[60vh] overflow-y-auto space-y-4 mb-4">
              {request.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender.id === userData.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender.id === userData.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">{msg.sender.name}</p>
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t bg-white p-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleStartCall}
                  variant="outline"
                  className="rounded-full p-3"
                  disabled={!request.writer}
                >
                  <Phone className="h-6 w-6" />
                </Button>
                <div className="flex-1 flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button type="submit" disabled={sending}>
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showVideoCall && request && (
        <VideoCall
          examRequestId={request.id}
          userId={userData?.id || ''}
          otherUserId={request.writer?.id || request.student.id}
          onEndCall={handleEndCall}
        />
      )}
    </div>
  );
};

export default Chat;
