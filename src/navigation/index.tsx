import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { CreateEditPostScreen } from '../screens/CreateEditPostScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { LoadingSpinner } from '../components/LoadingSpinner';

// ─── Param Lists — re-exported from types.ts to avoid circular imports ───────
export type { RootStackParamList, FeedStackParamList, ProfileStackParamList, CalendarStackParamList, TabParamList } from './types';
import type { RootStackParamList, FeedStackParamList, ProfileStackParamList, CalendarStackParamList, TabParamList } from './types';

// ─── Stack / Tab instances ────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
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

// ─── Profile Stack Navigator ────────────────────────────────────────────────────

function ProfileNavigator() {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="PostDetail" component={PostDetailScreen} />
      <ProfileStack.Screen name="CreateEditPost" component={CreateEditPostScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Calendar Stack Navigator ──────────────────────────────────────────────────
function CalendarNavigator() {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <CalendarStack.Screen name="CalendarHome" component={CalendarScreen} />
      <CalendarStack.Screen name="PostDetail" component={PostDetailScreen} />
    </CalendarStack.Navigator>
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
        tabBarIconStyle: {
          marginTop: 6,
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
            <MaterialIcons name="auto-stories" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarNavigator}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-month" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
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
