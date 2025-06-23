import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import LocationPicker from "./LocationPicker";

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: string;
  location?: Location;
}

interface ProfileSettingsProps {
  userData: UserData;
  onUpdate: (updatedData: Partial<UserData>) => void;
}

const ProfileSettings = ({ userData, onUpdate }: ProfileSettingsProps) => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: userData.name,
    phone: userData.phone
  });

  const handleLocationSelect = (location: Location) => {
    onUpdate({ location });
    setShowLocationPicker(false);
    toast({
      title: "Location Updated",
      description: `${location.address}, ${location.city}, ${location.state}`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to update your profile",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('http://localhost:3000/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      onUpdate(formData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={userData.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="Enter your phone number"
            />
          </div>

          {/* Location Section */}
          <div className="space-y-2">
            <Label>Location</Label>
            {userData.location ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Current:</strong> {userData.location.address}, {userData.location.city}, {userData.location.state}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLocationPicker(true)}
                  className="mt-2"
                >
                  Update Location
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationPicker(true)}
                className="w-full"
              >
                Add Location
              </Button>
            )}
          </div>

          <Button type="submit" className="w-full">
            Update Profile
          </Button>
        </form>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4">
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={userData.location}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLocationPicker(false)}
                  className="w-full mt-4"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSettings; 