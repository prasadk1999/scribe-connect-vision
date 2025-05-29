
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.9f9d24280fb74451a53d89c68a8ff451',
  appName: 'scribe-connect-vision',
  webDir: 'dist',
  server: {
    url: 'https://9f9d2428-0fb7-4451-a53d-89c68a8ff451.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
