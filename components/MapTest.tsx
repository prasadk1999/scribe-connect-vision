import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const MapTest = () => {
  const [status, setStatus] = useState('Testing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        setError('API key not found or not configured');
        return;
      }

      try {
        setStatus('Loading Google Maps...');
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        setStatus('Google Maps loaded successfully!');
        
        // Test geocoding
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ address: 'New York' });
        
        if (result.results.length > 0) {
          setStatus('API key is working correctly! Geocoding test passed.');
        } else {
          setError('Geocoding test failed');
        }
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    testAPI();
  }, []);

  return (
    <div className="p-4 border rounded">
      <h3>Google Maps API Test</h3>
      <p>Status: {status}</p>
      {error && <p className="text-red-600">Error: {error}</p>}
      <p>API Key: {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}</p>
    </div>
  );
};

export default MapTest; 