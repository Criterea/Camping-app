import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors, Fonts } from '@/theme';
import '@/lib/location-task';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.paper },
          headerTitleStyle: { fontFamily: Fonts.serif, fontSize: 18, fontWeight: '600' },
          headerTintColor: Colors.ink,
          contentStyle: { backgroundColor: Colors.paper },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Trail Journal' }} />
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
        <Stack.Screen
          name="trip/new"
          options={{ title: 'New Trip', presentation: 'modal' }}
        />
        <Stack.Screen name="trip/[id]/index" options={{ title: '' }} />
        <Stack.Screen
          name="trip/[id]/edit"
          options={{ title: 'Edit Trip', presentation: 'modal' }}
        />
        <Stack.Screen name="trip/[id]/map" options={{ title: 'Map' }} />
        <Stack.Screen
          name="trip/[id]/section/new"
          options={{ title: 'New Chapter', presentation: 'modal' }}
        />
        <Stack.Screen
          name="trip/[id]/section/[sectionId]/index"
          options={{ title: '' }}
        />
        <Stack.Screen
          name="trip/[id]/section/[sectionId]/edit"
          options={{ title: 'Edit Chapter', presentation: 'modal' }}
        />
        <Stack.Screen
          name="trip/[id]/section/[sectionId]/camera"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
