import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { getStudentsByClassSection, Student, getClasses } from '@/src/services/teacher';

export default function StudentsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const params = useLocalSearchParams<{ className?: string; section?: string }>();

  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>(params.className || '');
  const [selectedSection, setSelectedSection] = useState<string>(params.section || 'ALL');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const fetchData = async () => {
    try {
      console.log('[STUDENTS] Fetching data for class:', selectedClass, 'section:', selectedSection);
      
      const classesData = await getClasses();
      setClasses(classesData);
      
      // If no class is selected, try to get students from the first available class
      let classToFetch = selectedClass;
      if (!classToFetch && classesData.length > 0) {
        classToFetch = classesData[0].className;
        setSelectedClass(classToFetch);
      }
      
      if (classToFetch) {
        const studentsData = await getStudentsByClassSection(
          classToFetch, 
          selectedSection === 'ALL' ? undefined : selectedSection
        );
        console.log('[STUDENTS] Fetched', studentsData.length, 'students');
        setAllStudents(studentsData);
        setStudents(studentsData);
      } else {
        console.log('[STUDENTS] No class available to fetch students');
        setAllStudents([]);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setAllStudents([]);
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (params.className) {
      setSelectedClass(params.className);
    }
    if (params.section) {
      setSelectedSection(params.section);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [selectedClass, selectedSection]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    setSelectedSection('ALL');
    setShowClassDropdown(false);
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    setShowSectionDropdown(false);
  };

  const getAvailableSections = () => {
    const classItem = classes.find(c => c.className === selectedClass);
    if (!classItem) return [];
    return ['ALL', ...classItem.sections.map((s: any) => s.sectionName)];
  };

  const getStudentDisplayName = (student: Student) => {
    return student.name?.displayName || 
           `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim() ||
           student.userId ||
           'Unknown';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.headerTitle, { marginTop: 12, fontSize: 16 }]}>Loading students...</Text>
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
          <Text style={styles.headerTitle}>Students</Text>
        </View>

        {/* Dropdown Selectors */}
        <View style={styles.filtersContainer}>
          {/* Class Dropdown */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Select Class</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowClassDropdown(true)}
            >
              <Text style={styles.dropdownText}>
                {selectedClass || 'Choose a class'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Section Dropdown */}
          {selectedClass && (
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Select Section</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowSectionDropdown(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedSection === 'ALL' ? 'All Sections' : selectedSection}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Students List */}
        <View style={styles.section}>
          {!selectedClass ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Please select a class to view students</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No students found</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  {students.length} {students.length === 1 ? 'student' : 'students'} found
                </Text>
              </View>
              {students.map((student) => (
                <View key={student._id || student.userId} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentIcon}>
                      <Text style={styles.studentIconText}>👤</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{getStudentDisplayName(student)}</Text>
                      <Text style={styles.studentId}>ID: {student.userId}</Text>
                      {(student.studentDetails?.currentClass || student.academicInfo?.class) && (
                        <Text style={styles.studentClass}>
                          {student.studentDetails?.currentClass || student.academicInfo?.class}
                          {student.studentDetails?.currentSection || student.academicInfo?.section
                            ? ` - ${student.studentDetails?.currentSection || student.academicInfo?.section}`
                            : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {student.attendance && (
                    <View style={styles.studentStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Attendance</Text>
                        <Text style={styles.statValue}>
                          {student.attendance.attendancePercentage?.toFixed(1) || 0}%
                        </Text>
                      </View>
                      {student.averageMarks !== undefined && (
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Avg Marks</Text>
                          <Text style={styles.statValue}>
                            {student.averageMarks.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Class Dropdown Modal */}
      <Modal
        visible={showClassDropdown}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowClassDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClassDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <ScrollView style={styles.modalScroll}>
              {classes.map((classItem) => (
                <TouchableOpacity
                  key={classItem.classId}
                  style={[
                    styles.modalOption,
                    selectedClass === classItem.className && styles.modalOptionSelected
                  ]}
                  onPress={() => handleClassChange(classItem.className)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedClass === classItem.className && styles.modalOptionTextSelected
                  ]}>
                    Class {classItem.className}
                  </Text>
                  {selectedClass === classItem.className && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Section Dropdown Modal */}
      <Modal
        visible={showSectionDropdown}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSectionDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSectionDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Section</Text>
            <ScrollView style={styles.modalScroll}>
              {getAvailableSections().map((section) => (
                <TouchableOpacity
                  key={section}
                  style={[
                    styles.modalOption,
                    selectedSection === section && styles.modalOptionSelected
                  ]}
                  onPress={() => handleSectionChange(section)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedSection === section && styles.modalOptionTextSelected
                  ]}>
                    {section === 'ALL' ? 'All Sections' : `Section ${section}`}
                  </Text>
                  {selectedSection === section && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    filtersContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    filterGroup: {
      marginBottom: 16,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 8,
    },
    filterScroll: {
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#0F172A' : '#DBEAFE',
      marginRight: 8,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
    },
    filterChipActive: {
      backgroundColor: isDark ? '#1E3A8A' : '#60A5FA',
      borderColor: isDark ? '#3B82F6' : '#1E3A8A',
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1E3A8A',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    section: {
      paddingHorizontal: 20,
    },
    statsContainer: {
      marginBottom: 12,
    },
    statsText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1E3A8A',
    },
    studentCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
    },
    studentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    studentIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    studentIconText: {
      fontSize: 24,
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#1F2937',
      marginBottom: 4,
    },
    studentId: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 2,
    },
    studentClass: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    studentStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
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
    // Dropdown styles
    dropdownContainer: {
      marginBottom: 16,
    },
    dropdownLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 8,
    },
    dropdown: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownText: {
      fontSize: 16,
      color: isDark ? '#E5E7EB' : '#1F2937',
      flex: 1,
    },
    dropdownArrow: {
      fontSize: 12,
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginLeft: 8,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      maxHeight: '70%',
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 16,
      textAlign: 'center',
    },
    modalScroll: {
      maxHeight: 400,
    },
    modalOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
    },
    modalOptionSelected: {
      backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
      borderWidth: 2,
      borderColor: isDark ? '#3B82F6' : '#60A5FA',
    },
    modalOptionText: {
      fontSize: 16,
      color: isDark ? '#E5E7EB' : '#1F2937',
      fontWeight: '600',
    },
    modalOptionTextSelected: {
      color: isDark ? '#93C5FD' : '#1E3A8A',
      fontWeight: '700',
    },
    checkmark: {
      fontSize: 20,
      color: isDark ? '#60A5FA' : '#1E3A8A',
      fontWeight: '700',
    },
  });
}

