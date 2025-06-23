import { Redirect } from 'expo-router';

export default function App() {
  // For now, we redirect to the main tabs.
  // Later, we will add auth logic here.
  return <Redirect href="/(tabs)" />;
} 