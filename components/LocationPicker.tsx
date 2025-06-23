import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

const LocationPicker = ({ onLocationSelect, initialLocation }: LocationPickerProps) => {
  console.log('LocationPicker component rendering');
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    address: initialLocation?.address || '',
    city: initialLocation?.city || '',
    state: initialLocation?.state || '',
    country: initialLocation?.country || '',
    postalCode: initialLocation?.postalCode || ''
  });

  // Initialize map when container is ready
  useEffect(() => {
    console.log('useEffect triggered:', { containerReady, hasMapRef: !!mapRef.current, hasMap: !!map, hasError: !!mapError });
    if (containerReady && mapRef.current && !map && !mapError) {
      console.log('Container ready, initializing map...');
      initializeMap();
    }
  }, [containerReady, map, mapError]);

  // Fallback initialization after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerReady && !mapRef.current && !mapError) {
        console.log('Fallback initialization - trying to initialize map');
        initializeMap();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [containerReady, mapError]);

  const setMapRef = (node: HTMLDivElement | null) => {
    console.log('setMapRef called with:', node);
    mapRef.current = node;
    if (node) {
      console.log('Map container ref set');
      setContainerReady(true);
    } else {
      console.log('Map container ref cleared');
      setContainerReady(false);
    }
  };

  // Add a timeout to detect if container never gets set
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerReady && !mapRef.current) {
        console.error('Container never got set after timeout');
        setMapError('Map container failed to initialize. Please try again.');
        setIsLoading(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [containerReady]);

  const initializeMap = async () => {
    console.log('Initializing map...');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found');
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setMapError('Google Maps API key is not configured. Please check your environment variables.');
      setIsLoading(false);
      return;
    }
    
    // Try to get the container if it's not available
    if (!mapRef.current) {
      console.log('Map container not available, waiting...');
      // Wait a bit and try again
      setTimeout(() => {
        if (mapRef.current) {
          console.log('Map container now available, retrying initialization');
          initializeMap();
        } else {
          console.error('Map container still not available after retry');
          setMapError('Map container not available');
          setIsLoading(false);
        }
      }, 500);
      return;
    }
    
    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    try {
      console.log('Loading Google Maps...');
      const google = await loader.load();
      console.log('Google Maps loaded successfully');
      
      console.log('Creating map instance...');
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: initialLocation 
          ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
          : { lat: 20.5937, lng: 78.9629 }, // Default to India
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      console.log('Map instance created');
      setMap(mapInstance);

      // Add click listener
      mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        
        if (lat && lng) {
          placeMarker(lat, lng);
          reverseGeocode(lat, lng);
        }
      });

      // If initial location exists, place marker
      if (initialLocation) {
        placeMarker(initialLocation.latitude, initialLocation.longitude);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      setMapError('Failed to load Google Maps. Please check your internet connection and try again.');
      setIsLoading(false);
    }
  };

  const placeMarker = (lat: number, lng: number) => {
    if (marker) {
      marker.setMap(null);
    }

    const newMarker = new google.maps.Marker({
      position: { lat, lng },
      map: map,
      draggable: true
    });

    setMarker(newMarker);

    // Add drag listener
    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        reverseGeocode(position.lat(), position.lng());
      }
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!map) return;

    const geocoder = new google.maps.Geocoder();
    
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results[0]) {
        const result = response.results[0];
        const addressComponents = result.address_components;
        
        let address = '';
        let city = '';
        let state = '';
        let country = '';
        let postalCode = '';

        // Extract address components
        addressComponents.forEach(component => {
          const types = component.types;
          
          if (types.includes('street_number') || types.includes('route')) {
            address += component.long_name + ' ';
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
          if (types.includes('country')) {
            country = component.long_name;
          }
          if (types.includes('postal_code')) {
            postalCode = component.long_name;
          }
        });

        setFormData({
          address: address.trim(),
          city,
          state,
          country,
          postalCode
        });

        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: address.trim(),
          city,
          state,
          country,
          postalCode
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map) {
            map.setCenter({ lat: latitude, lng: longitude });
            map.setZoom(15);
            placeMarker(latitude, longitude);
            reverseGeocode(latitude, longitude);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
        }
      );
    }
  };

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveLocation = () => {
    if (selectedLocation) {
      const finalLocation: Location = {
        ...selectedLocation,
        ...formData
      };
      onLocationSelect(finalLocation);
    }
  };

  // Add a retry mechanism
  const retryInitialization = () => {
    setMapError(null);
    setIsLoading(true);
    setContainerReady(false);
    // Reset container ready state and let the ref callback trigger initialization
    setTimeout(() => {
      if (mapRef.current) {
        setContainerReady(true);
      } else {
        setMapError('Map container still not available');
        setIsLoading(false);
      }
    }, 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-center">
            {containerReady ? 'Loading map...' : 'Preparing map container...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (mapError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Your Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{mapError}</p>
          </div>
          <Button
            onClick={retryInitialization}
            className="w-full"
          >
            Retry Loading Map
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Your Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Container */}
        <div 
          ref={setMapRef} 
          className="w-full h-64 rounded-lg border"
        />
        
        {/* Current Location Button */}
        <Button
          onClick={getCurrentLocation}
          variant="outline"
          className="w-full"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Use Current Location
        </Button>

        {/* Address Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleFormChange('address', e.target.value)}
              placeholder="Enter street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleFormChange('city', e.target.value)}
                placeholder="Enter city"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleFormChange('state', e.target.value)}
                placeholder="Enter state"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleFormChange('country', e.target.value)}
                placeholder="Enter country"
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleFormChange('postalCode', e.target.value)}
                placeholder="Enter postal code"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveLocation}
            disabled={!selectedLocation}
            className="w-full"
          >
            Save Location
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationPicker; 