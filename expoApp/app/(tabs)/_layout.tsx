import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import PermissionRefreshIndicator from '@/components/PermissionRefreshIndicator';

/**
 * ROLE-BASED TAB LAYOUT
 * Returns completely different tab configurations based on user role
 */
export default function TabLayout() {
  const { theme } = useTheme();
  const colorScheme = theme;
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const storedRole = await AsyncStorage.getItem('role');
      console.log('[TAB LAYOUT] User role:', storedRole);
      setRole(storedRole);
    } catch (error) {
      console.error('[TAB LAYOUT] Error checking role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F14' }}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  // STUDENT LAYOUT - Return early with only student tabs
  if (role === 'student') {
    console.log('[TAB LAYOUT] Rendering STUDENT tabs only');
    return (
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
          }}>
          
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="attendance"
            options={{
              title: 'Attendance',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar.badge.checkmark" color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="assignments"
            options={{
              title: 'Assignments',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="results"
            options={{
              title: 'Results',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="activity"
            options={{
              title: 'Messages',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="message.fill" color={color} />,
            }}
          />

          {/* Hide teacher screens and explore */}
          <Tabs.Screen name="explore" options={{ href: null }} />
          <Tabs.Screen name="classes" options={{ href: null }} />
          <Tabs.Screen name="students" options={{ href: null }} />
          <Tabs.Screen name="teacher-home" options={{ href: null }} />
          <Tabs.Screen name="student-home" options={{ href: null }} />
          <Tabs.Screen name="attendance-teacher" options={{ href: null }} />
        </Tabs>
        <PermissionRefreshIndicator />
      </View>
    );
  }

  // TEACHER LAYOUT - Return early with only teacher tabs
  if (role === 'teacher') {
    console.log('[TAB LAYOUT] Rendering TEACHER tabs only');
    return (
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
          }}>
          
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="classes"
            options={{
              title: 'Classes',
              tabBarIcon: ({ color }) => <Ionicons name="school" size={28} color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="students"
            options={{
              title: 'Students',
              tabBarIcon: ({ color }) => <Ionicons name="people" size={28} color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="assignments"
            options={{
              title: 'Assignments',
              tabBarIcon: ({ color }) => <Ionicons name="document-text" size={28} color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="attendance-teacher"
            options={{
              title: 'Attendance',
              tabBarIcon: ({ color }) => <Ionicons name="calendar" size={28} color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="results"
            options={{
              title: 'Results',
              tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={28} color={color} />,
            }}
          />
          
          <Tabs.Screen
            name="activity"
            options={{
              title: 'Messages',
              tabBarIcon: ({ color }) => <Ionicons name="mail" size={28} color={color} />,
            }}
          />

          {/* Hide student screens */}
          <Tabs.Screen name="explore" options={{ href: null }} />
          <Tabs.Screen name="teacher-home" options={{ href: null }} />
          <Tabs.Screen name="student-home" options={{ href: null }} />
          <Tabs.Screen name="attendance" options={{ href: null }} />
        </Tabs>
        <PermissionRefreshIndicator />
      </View>
    );
  }

  // Fallback for unknown roles
  return null;
}