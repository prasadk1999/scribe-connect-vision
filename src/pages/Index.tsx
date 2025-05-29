
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { User, Search, MessageCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" role="banner">
            ScribeConnect
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Connecting blind students with dedicated writers for examinations
          </p>
        </div>

        {/* Main Action Card */}
        <Card className="shadow-lg border-2 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-800">Welcome</CardTitle>
            <CardDescription className="text-lg">
              Get started by registering or logging in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/register')}
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              aria-label="Register for ScribeConnect"
            >
              <User className="mr-3 h-6 w-6" />
              Register / Login
            </Button>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center text-gray-800">Key Features</h2>
          <div className="grid gap-4">
            <Card className="bg-white/80">
              <CardContent className="flex items-center p-4">
                <Search className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <h3 className="font-semibold">Smart Writer Search</h3>
                  <p className="text-sm text-gray-600">Find qualified writers in your area</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80">
              <CardContent className="flex items-center p-4">
                <MessageCircle className="h-8 w-8 text-green-600 mr-4" />
                <div>
                  <h3 className="font-semibold">Direct Communication</h3>
                  <p className="text-sm text-gray-600">Chat and call with your matched writer</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
