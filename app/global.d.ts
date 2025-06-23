import 'react-native';

// Import the auto-generated types for expo-router

declare module 'expo-router' {
  export interface LinkProps<T> extends Omit<OriginalLinkProps<T>, 'href'> {
    href: RouteType;
  }
}

// This is a list of all the route names that will be typed.
type RouteType =
  | '/'
  | '/(tabs)'
  | '/(tabs)/studentDashboard'
  | '/(tabs)/writerDashboard'
  | '/register'
  | '/searchWriters'
  | '/chat/[id]' // Dynamic route for chat
  | '/+not-found'; 