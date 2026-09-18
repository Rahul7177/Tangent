import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { useStore } from '../store/useStore';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { ThreadDetailScreen } from '../screens/ThreadDetailScreen';
import { WhisperScreen } from '../screens/WhisperScreen';
import { CallsScreen } from '../screens/CallsScreen';
import { CallScreen } from '../screens/CallScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AddContactScreen } from '../screens/AddContactScreen';
import { Icon, IconName } from '../components/icons';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { palette } = useTheme();
  const name: IconName = label === 'Chats' ? 'chat' : label === 'Calls' ? 'phone' : 'gear';
  return (
    <View style={tabStyles.wrap}>
      <Icon
        name={name}
        size={24}
        color={focused ? palette.ember : palette.textSecondary}
        strokeWidth={focused ? 2 : 1.8}
      />
      {focused ? <View style={[tabStyles.pip, { backgroundColor: palette.ember }]} /> : null}
    </View>
  );
}

function MainTabs() {
  const { palette, mode } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.ember,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <BlurView
            intensity={78}
            tint={mode === 'dark' ? 'dark' : 'light'}
            style={{ flex: 1, backgroundColor: palette.glass, borderTopColor: palette.hairline ?? 'transparent', borderTopWidth: 1 }}
          />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: mode === 'dark' ? 'transparent' : palette.hairline ?? 'transparent',
          position: 'absolute',
        },
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tabs.Screen name="Chats" component={ChatListScreen} />
      <Tabs.Screen name="Calls" component={CallsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { mode, palette } = useTheme();
  const onboarded = useStore((s) => s.onboarded);
  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer
      theme={{
        ...navTheme,
        colors: { ...navTheme.colors, background: palette.bgBase, primary: palette.ember },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="ThreadDetail" component={ThreadDetailScreen} />
            <Stack.Screen name="Whisper" component={WhisperScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AddContact" component={AddContactScreen} />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  wrap: { width: 48, height: 36, alignItems: 'center', justifyContent: 'center', gap: 3 },
  pip: { width: 4, height: 4, borderRadius: 2 },
});
