import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSchoolInfo, SchoolInfo } from '@/src/services/student';
import { useTheme } from '@/contexts/ThemeContext';

export default function MenuScreen() {
  const router = useRouter();
  const { theme, toggleTheme: toggleGlobalTheme } = useTheme();
  
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [schoolAddressText, setSchoolAddressText] = useState<string>('BY SPANDHAN TECHNOLOGIES');
  
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schoolInfo, userDataStr] = await Promise.all([
          getSchoolInfo(),
          AsyncStorage.getItem('userData')
        ]);
        setSchool(schoolInfo);
        if (schoolInfo && (schoolInfo as any).address) {
          const addr: any = (schoolInfo as any).address;
          const parts = [addr.city, addr.district, addr.taluka, addr.state, addr.country, addr.zipCode || addr.pinCode]
            .filter(Boolean)
            .map((p: any) => String(p));
          if (parts.length > 0) setSchoolAddressText(parts.join(', '));
        } else if (schoolInfo?.address && typeof schoolInfo.address === 'string') {
          setSchoolAddressText(String(schoolInfo.address));
        }
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          const rawName = userData?.name ?? userData?.fullName ?? userData?.displayName;
          let display = '';
          if (typeof rawName === 'string') {
            display = rawName;
          } else if (rawName && typeof rawName === 'object') {
            display = rawName.displayName || [rawName.firstName, rawName.middleName, rawName.lastName].filter(Boolean).join(' ');
          } else {
            display = [userData?.firstName, userData?.middleName, userData?.lastName].filter(Boolean).join(' ');
          }
          setUserName(display || 'Student');
        }
      } catch (e) {
        // no-op; keep graceful defaults
      }
    };
    loadData();
  }, []);

  const menuItems = [
    { id: 1, title: 'My Profile', icon: '👤', iconBg: '#FECACA', route: '/profile' },
    { id: 2, title: 'My School', icon: '🏫', iconBg: '#DBEAFE', route: '/school' },
    { id: 3, title: theme === 'dark' ? 'Light Mode' : 'Dark Mode', icon: theme === 'dark' ? '☀️' : '🌙', iconBg: '#FEF3C7', route: 'theme-toggle' },
  ];

  const handleMenuPress = (route: string) => {
    if (route === 'theme-toggle') {
      toggleGlobalTheme();
    } else {
      router.push(route as any);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear all stored authentication data
      await AsyncStorage.multiRemove(['authToken', 'userData', 'schoolCode']);

      // Navigate to the role selection screen (first page) and reset the navigation stack
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error clearing storage, still navigate to role selection
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => handleMenuPress(item.route)}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE', paddingTop: 0 },
    scrollView: { flex: 1, paddingTop: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    backIcon: { fontSize: 28, color: isDark ? '#93C5FD' : '#1E3A8A' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    placeholder: { width: 40 },
    logoContainer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
    logoPlaceholder: { alignItems: 'center' },
    logoTitle: { fontSize: 28, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 4 },
    logoSubtitle: { fontSize: 9, color: isDark ? '#93C5FD' : '#1E3A8A', letterSpacing: 1.5 },
    menuContainer: { paddingHorizontal: 20, gap: 16 },
    menuItem: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    iconText: { fontSize: 28 },
    menuItemText: { fontSize: 18, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1E3A8A' },
    arrowIcon: { fontSize: 32, color: '#93C5FD', fontWeight: '300' },
    logoutContainer: { paddingHorizontal: 20, marginTop: 32 },
    logoutButton: { backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    profileStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 20, gap: 12 },
    profileName: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' },
    profileSub: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
  });
}