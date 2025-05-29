
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SearchWriters = () => {
  const navigate = useNavigate();
  const [searchCriteria, setSearchCriteria] = useState({
    examName: "",
    examDate: "",
    duration: "",
    subject: "",
    location: ""
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchCriteria.examName || !searchCriteria.examDate) {
      toast({
        title: "Missing Information",
        description: "Please provide exam name and date",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    // Simulate search API call
    setTimeout(() => {
      const mockResults = [
        {
          id: '1',
          name: 'John Smith',
          rating: 4.8,
          experience: '5+ years',
          distance: '2.3 km',
          specialties: ['Mathematics', 'Science'],
          availability: 'Available'
        },
        {
          id: '2',
          name: 'Emily Davis',
          rating: 4.9,
          experience: '3+ years',
          distance: '1.8 km',
          specialties: ['History', 'Literature'],
          availability: 'Available'
        },
        {
          id: '3',
          name: 'Robert Wilson',
          rating: 4.7,
          experience: '7+ years',
          distance: '3.1 km',
          specialties: ['Mathematics', 'Physics'],
          availability: 'Available'
        }
      ];
      
      setSearchResults(mockResults);
      setIsSearching(false);
      
      toast({
        title: "Search Complete",
        description: `Found ${mockResults.length} available writers`,
      });
    }, 2000);
  };

  const handleRequestWriter = (writerId: string, writerName: string) => {
    // Store the request
    const request = {
      ...searchCriteria,
      writerId,
      writerName,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    const existingRequests = JSON.parse(localStorage.getItem('activeRequests') || '[]');
    localStorage.setItem('activeRequests', JSON.stringify([...existingRequests, request]));
    
    toast({
      title: "Request Sent",
      description: `Your request has been sent to ${writerName}. They will be notified shortly.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl text-blue-800">Find a Writer</CardTitle>
                <CardDescription className="text-lg">
                  Search for qualified writers for your examination
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/student-dashboard')}
                aria-label="Go back to dashboard"
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Search Form */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Exam Details</CardTitle>
            <CardDescription>
              Provide information about your examination
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="examName" className="text-lg font-medium">Exam Name *</Label>
                <Input
                  id="examName"
                  value={searchCriteria.examName}
                  onChange={(e) => setSearchCriteria({...searchCriteria, examName: e.target.value})}
                  placeholder="e.g., Mathematics Final Exam"
                  className="h-12 text-lg"
                  required
                />
              </div>

              <div>
                <Label htmlFor="examDate" className="text-lg font-medium">Exam Date *</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={searchCriteria.examDate}
                  onChange={(e) => setSearchCriteria({...searchCriteria, examDate: e.target.value})}
                  className="h-12 text-lg"
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration" className="text-lg font-medium">Duration</Label>
                <Select onValueChange={(value) => setSearchCriteria({...searchCriteria, duration: value})}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-hour">1 hour</SelectItem>
                    <SelectItem value="2-hours">2 hours</SelectItem>
                    <SelectItem value="3-hours">3 hours</SelectItem>
                    <SelectItem value="4-hours">4 hours</SelectItem>
                    <SelectItem value="longer">More than 4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject" className="text-lg font-medium">Subject</Label>
                <Select onValueChange={(value) => setSearchCriteria({...searchCriteria, subject: value})}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="literature">Literature</SelectItem>
                    <SelectItem value="languages">Languages</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300"
            >
              <Search className="mr-3 h-6 w-6" />
              {isSearching ? 'Searching...' : 'Search for Writers'}
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800">Available Writers</CardTitle>
              <CardDescription>
                {searchResults.length} writers found matching your criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((writer) => (
                  <Card key={writer.id} className="bg-purple-50 border border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{writer.name}</h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>⭐ Rating: {writer.rating}/5</p>
                            <p>📍 Distance: {writer.distance}</p>
                            <p>🎓 Experience: {writer.experience}</p>
                            <p>📚 Specialties: {writer.specialties.join(', ')}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <span className="inline-block px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
                            {writer.availability}
                          </span>
                          <div>
                            <Button 
                              onClick={() => handleRequestWriter(writer.id, writer.name)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Request Writer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SearchWriters;
