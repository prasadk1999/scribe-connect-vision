import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { MessageCircle, User, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { socket, connectSocket } from "@/lib/socket";

interface UserData {
  name: string;
  userType: string;
  id: string;
}

interface ExamRequest {
  id: string;
  examName: string;
  examDate: string;
  duration: string;
  subject: string;
  status: string;
  writer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string;
      userType: string;
    };
  }>;
}

const BlindDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive"
      });
      navigate('/login');
      return null;
    }
    return token;
  };

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    const token = getAuthToken();
    
    if (!stored || !token) {
      return;
    }

    const data = JSON.parse(stored);
    if (data.userType !== 'blind') {
      navigate('/writer-dashboard');
      return;
    }
    setUserData(data);
    fetchRequests(data.id);
    connectSocket(data.id);

    // Set up socket listeners
    socket.on('examRequestUpdate', (updatedRequest) => {
      setRequests(prev => prev.map(req => 
        req.id === updatedRequest.id ? updatedRequest : req
      ));
    });

    socket.on('newMessage', (message) => {
      setRequests(prev => prev.map(req => {
        if (req.id === message.examRequestId) {
          return {
            ...req,
            messages: [...req.messages, message]
          };
        }
        return req;
      }));
    });

    return () => {
      socket.off('examRequestUpdate');
      socket.off('newMessage');
    };
  }, [navigate]);

  const fetchRequests = async (studentId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`http://localhost:3000/api/student/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (requestId: string) => {
    const token = getAuthToken();
    if (!token) return;
    localStorage.setItem('currentChatRequestId', requestId);
    navigate(`/chat/${requestId}`);
  };

  if (!userData) return null;

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const acceptedRequests = requests.filter(req => req.status === 'accepted');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-green-800">
              Welcome, {userData.name}
            </CardTitle>
            <CardDescription className="text-lg">
              Your Exam Requests Dashboard
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Pending Requests */}
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-800">Pending Requests</CardTitle>
            <CardDescription>
              Your exam requests waiting for writers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading requests...</p>
            ) : pendingRequests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No pending requests. Create a new request to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="bg-orange-50 border border-orange-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{request.examName}</h3>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(request.examDate).toLocaleDateString()} | Duration: {request.duration}
                          </p>
                          <p className="text-sm text-gray-600">Subject: {request.subject}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted Requests */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <MessageCircle className="mr-3 h-6 w-6" />
              Active Requests
            </CardTitle>
            <CardDescription>
              Your exam requests with assigned writers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading requests...</p>
            ) : acceptedRequests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No active requests. Your pending requests will appear here once accepted by a writer.
              </p>
            ) : (
              <div className="space-y-4">
                {acceptedRequests.map((request) => (
                  <Card key={request.id} className="bg-blue-50 border border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{request.examName}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(request.examDate).toLocaleDateString()} | {request.duration}
                          </p>
                          <p className="text-sm text-gray-600">Subject: {request.subject}</p>
                          {request.writer && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Assigned Writer:</p>
                              <p className="text-sm text-gray-600">{request.writer.name}</p>
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleChatClick(request.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Section */}
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <User className="mr-3 h-6 w-6" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full h-12 text-lg"
              onClick={() => {
                localStorage.removeItem('userData');
                localStorage.removeItem('token');
                navigate('/');
              }}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BlindDashboard; 