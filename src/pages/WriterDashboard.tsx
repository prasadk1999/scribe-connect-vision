
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { MessageCircle, User, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserData {
  name: string;
  userType: string;
  id: string;
}

interface WriterRequest {
  id: string;
  studentName: string;
  examName: string;
  examDate: string;
  duration: string;
  status: string;
}

const WriterDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingRequests, setPendingRequests] = useState<WriterRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<WriterRequest[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.userType !== 'writer') {
        navigate('/student-dashboard');
        return;
      }
      setUserData(data);
    } else {
      navigate('/register');
    }

    // Load requests (mock data for demonstration)
    const mockRequests: WriterRequest[] = [
      {
        id: '1',
        studentName: 'Sarah Johnson',
        examName: 'Mathematics Final Exam',
        examDate: '2024-06-15',
        duration: '3 hours',
        status: 'pending'
      },
      {
        id: '2',
        studentName: 'Michael Chen',
        examName: 'History Midterm',
        examDate: '2024-06-20',
        duration: '2 hours',
        status: 'pending'
      }
    ];
    setPendingRequests(mockRequests);
  }, [navigate]);

  const handleAcceptRequest = (requestId: string) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (request) {
      const updatedRequest = { ...request, status: 'accepted' };
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setAcceptedRequests(prev => [...prev, updatedRequest]);
      
      toast({
        title: "Request Accepted",
        description: `You've accepted to help ${request.studentName} with their ${request.examName}`,
      });
    }
  };

  const handleDeclineRequest = (requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    toast({
      title: "Request Declined",
      description: "The request has been declined",
    });
  };

  if (!userData) return null;

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
              Your Writer Dashboard
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Pending Requests */}
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-800">Pending Writer Requests</CardTitle>
            <CardDescription>
              Students requesting your writing assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No pending requests at the moment.
              </p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="bg-orange-50 border border-orange-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{request.studentName}</h3>
                          <p className="text-gray-700">Exam: {request.examName}</p>
                          <p className="text-sm text-gray-600">
                            Date: {request.examDate} | Duration: {request.duration}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => handleAcceptRequest(request.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300"
                          >
                            Accept Request
                          </Button>
                          <Button 
                            onClick={() => handleDeclineRequest(request.id)}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted Assignments */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <MessageCircle className="mr-3 h-6 w-6" />
              My Assignments
            </CardTitle>
            <CardDescription>
              Students you're currently helping
            </CardDescription>
          </CardHeader>
          <CardContent>
            {acceptedRequests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No active assignments. Accept requests above to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {acceptedRequests.map((request) => (
                  <Card key={request.id} className="bg-blue-50 border border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{request.studentName}</h3>
                          <p className="text-sm text-gray-600">
                            {request.examName} - {request.examDate}
                          </p>
                        </div>
                        <Button 
                          onClick={() => navigate(`/chat/${request.id}`)}
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

export default WriterDashboard;
