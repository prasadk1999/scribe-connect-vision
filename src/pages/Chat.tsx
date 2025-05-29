
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUp, MessageCircle } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "writer",
      content: "Hello! I'm ready to help you with your exam. What specific assistance do you need?",
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: 2,
      sender: "student", 
      content: "Thank you! I need help with my Mathematics final exam on June 15th.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: "student",
        content: message,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([...messages, newMessage]);
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-blue-800">
                <MessageCircle className="mr-3 h-6 w-6" />
                Chat with Writer
              </CardTitle>
              <Button 
                variant="outline" 
                onClick={() => navigate('/student-dashboard')}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Interface */}
        <Card className="border-2 border-green-200">
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === 'student'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender === 'student' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 h-12 text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                >
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Actions */}
        <Card className="border-2 border-orange-200">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700">
                📞 Voice Call
              </Button>
              <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700">
                📹 Video Call
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
