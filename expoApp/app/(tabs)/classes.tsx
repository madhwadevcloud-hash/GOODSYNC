import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { getClasses, Class } from '@/src/services/teacher';

export default function ClassesScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  const handleClassPress = (className: string) => {
    router.push({
      pathname: '/(tabs)/students',
      params: { className }
    });
  };

  const handleSectionPress = (className: string, sectionName: string) => {
    router.push({
      pathname: '/(tabs)/students',
      params: { className, section: sectionName }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.headerTitle, { marginTop: 12, fontSize: 16 }]}>Loading classes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Classes & Sections</Text>
        </View>

        <View style={styles.section}>
          {classes.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No classes available</Text>
            </View>
          ) : (
            classes.map((classItem) => (
              <View key={classItem.classId} style={styles.classCard}>
                <TouchableOpacity
                  style={styles.classHeader}
                  onPress={() => setSelectedClass(selectedClass === classItem.className ? null : classItem.className)}
                >
                  <View style={styles.classHeaderLeft}>
                    <View style={styles.classIcon}>
                      <Text style={styles.classIconText}>📚</Text>
                    </View>
                    <View style={styles.classInfo}>
                      <Text style={styles.className}>{classItem.className}</Text>
                      <Text style={styles.sectionCount}>
                        {classItem.sections.length} {classItem.sections.length === 1 ? 'section' : 'sections'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.expandIcon}>
                    {selectedClass === classItem.className ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {selectedClass === classItem.className && (
                  <View style={styles.sectionsContainer}>
                    {classItem.sections.length === 0 ? (
                      <Text style={styles.noSectionsText}>No sections available</Text>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.sectionButton}
                          onPress={() => handleClassPress(classItem.className)}
                        >
                          <Text style={styles.sectionButtonText}>View All Students</Text>
                        </TouchableOpacity>
                        {classItem.sections.map((section) => (
                          <TouchableOpacity
                            key={section.sectionId}
                            style={styles.sectionItem}
                            onPress={() => handleSectionPress(classItem.className, section.sectionName)}
                          >
                            <View style={styles.sectionItemLeft}>
                              <Text style={styles.sectionIcon}>📋</Text>
                              <Text style={styles.sectionName}>Section {section.sectionName}</Text>
                            </View>
                            <Text style={styles.arrowIcon}>→</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0B0F14' : '#E0F2FE',
    },
    scrollView: {
      flex: 1,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      textAlign: 'center',
    },
    section: {
      paddingHorizontal: 20,
    },
    classCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      overflow: 'hidden',
    },
    classHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    classHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    classIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    classIconText: {
      fontSize: 24,
    },
    classInfo: {
      flex: 1,
    },
    className: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937',
      marginBottom: 4,
    },
    sectionCount: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    expandIcon: {
      fontSize: 16,
      color: isDark ? '#93C5FD' : '#1E3A8A',
      fontWeight: '600',
    },
    sectionsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
    },
    sectionButton: {
      backgroundColor: isDark ? '#1E3A8A' : '#60A5FA',
      borderRadius: 12,
      padding: 14,
      marginTop: 12,
      marginBottom: 8,
      alignItems: 'center',
    },
    sectionButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    sectionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      marginTop: 8,
      backgroundColor: isDark ? '#111827' : '#F3F4F6',
      borderRadius: 12,
    },
    sectionItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    sectionName: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
    },
    arrowIcon: {
      fontSize: 18,
      color: isDark ? '#93C5FD' : '#1E3A8A',
    },
    noDataContainer: {
      alignItems: 'center',
      marginTop: 40,
      paddingVertical: 40,
    },
    noDataText: {
      fontSize: 16,
      color: isDark ? '#93C5FD' : '#1E3A8A',
      fontWeight: '600',
    },
    noSectionsText: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
      padding: 12,
    },
  });
}

