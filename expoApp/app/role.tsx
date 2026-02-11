import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';

export default function RoleGate() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const router = useRouter();

  const goToLogin = (role: 'Student' | 'Teacher' | 'Admin') => {
    router.push({ pathname: '/login', params: { role } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.inner}>
        <Text style={styles.title}>Continue as</Text>
        <TouchableOpacity style={styles.roleButton} onPress={() => goToLogin('Student')}>
          <Text style={styles.roleText}>Student</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleButton} onPress={() => goToLogin('Teacher')}>
          <Text style={styles.roleText}>Teacher</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: isDark ? '#93C5FD' : '#1E3A8A' },
    roleButton: { width: '80%', backgroundColor: '#60A5FA', paddingVertical: 14, borderRadius: 12, marginVertical: 8, alignItems: 'center' },
    roleText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}


