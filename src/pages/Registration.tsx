
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const Registration = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userType) {
      toast({
        title: "Error",
        description: "Please select whether you are a student or writer",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    // Store user data (in a real app, this would be sent to backend)
    localStorage.setItem('userData', JSON.stringify({
      ...formData,
      userType,
      id: Date.now().toString()
    }));

    toast({
      title: "Registration Successful",
      description: "Welcome to ScribeConnect!",
    });

    // Navigate based on user type
    if (userType === "student") {
      navigate('/student-dashboard');
    } else {
      navigate('/writer-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-2 border-blue-200">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-blue-800">Register</CardTitle>
          <CardDescription className="text-lg">
            Join ScribeConnect to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Type Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">I am a:</Label>
              <RadioGroup value={userType} onValueChange={setUserType} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 focus-within:border-blue-500">
                  <RadioGroupItem value="student" id="student" className="h-5 w-5" />
                  <Label htmlFor="student" className="text-lg cursor-pointer flex-1">
                    Blind Student (seeking a writer)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 focus-within:border-blue-500">
                  <RadioGroupItem value="writer" id="writer" className="h-5 w-5" />
                  <Label htmlFor="writer" className="text-lg cursor-pointer flex-1">
                    Writer (offering writing services)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-lg font-medium">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-12 text-lg"
                  placeholder="Enter your full name"
                  required
                  aria-describedby="name-description"
                />
                <p id="name-description" className="sr-only">Enter your complete legal name</p>
              </div>

              <div>
                <Label htmlFor="email" className="text-lg font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="h-12 text-lg"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-lg font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="h-12 text-lg"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-lg font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="h-12 text-lg"
                  placeholder="Create a password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-lg font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="h-12 text-lg"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
              aria-label="Complete registration"
            >
              Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registration;
