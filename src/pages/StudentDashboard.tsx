
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, User } from "lucide-react";

interface UserData {
  name: string;
  userType: string;
  id: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.userType !== 'student') {
        navigate('/writer-dashboard');
        return;
      }
      setUserData(data);
    } else {
      navigate('/register');
    }

    // Load active requests (mock data for now)
    const requests = JSON.parse(localStorage.getItem('activeRequests') || '[]');
    setActiveRequests(requests);
  }, [navigate]);

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-blue-800">
              Welcome, {userData.name}
            </CardTitle>
            <CardDescription className="text-lg">
              Your Student Dashboard
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Search className="mr-3 h-6 w-6" />
                Find a Writer
              </CardTitle>
              <CardDescription className="text-lg">
                Search for qualified writers for your examination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/search-writers')}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300"
                aria-label="Start searching for writers"
              >
                Start Search
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <MessageCircle className="mr-3 h-6 w-6" />
                My Conversations
              </CardTitle>
              <CardDescription className="text-lg">
                Chat with your matched writers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full h-12 text-lg border-purple-300 hover:bg-purple-50 focus:ring-4 focus:ring-purple-300"
                disabled={activeRequests.length === 0}
              >
                {activeRequests.length > 0 ? `${activeRequests.length} Active Chats` : 'No Active Chats'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Requests */}
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-800">Active Writer Requests</CardTitle>
            <CardDescription>
              Current requests for examination writers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeRequests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No active requests. Click "Find a Writer" to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {activeRequests.map((request, index) => (
                  <Card key={index} className="bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{request.examName}</h3>
                          <p className="text-sm text-gray-600">
                            Date: {request.examDate} | Duration: {request.duration}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm">
                          {request.status}
                        </span>
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

export default StudentDashboard;
