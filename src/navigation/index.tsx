import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { CreateEditPostScreen } from '../screens/CreateEditPostScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoadingSpinner } from '../components/LoadingSpinner';

// ─── Param Lists — re-exported from types.ts to avoid circular imports ───────
export type { RootStackParamList, FeedStackParamList, TabParamList } from './types';
import type { RootStackParamList, FeedStackParamList, TabParamList } from './types';

// ─── Stack / Tab instances ────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ─── Feed Stack Navigator ─────────────────────────────────────────────────────

function FeedNavigator() {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <FeedStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <FeedStack.Screen name="Feed" component={FeedScreen} />
      <FeedStack.Screen name="PostDetail" component={PostDetailScreen} />
      <FeedStack.Screen name="CreateEditPost" component={CreateEditPostScreen} />
    </FeedStack.Navigator>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────

function AppTabs() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{
          title: 'Blog',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 2, color }}>📰</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 2, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export function RootNavigator() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  const { colors } = theme;

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <RootStack.Screen name="App" component={AppTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
