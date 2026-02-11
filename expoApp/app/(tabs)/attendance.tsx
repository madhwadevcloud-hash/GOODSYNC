import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { getStudentAttendance, AttendanceRecord } from '@/src/services/student';

export default function StudentAttendanceScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const calendarStyles = getCalendarStyles(isDark);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ 
    totalDays: 0, 
    presentDays: 0, 
    absentDays: 0, 
    attendancePercentage: 0,
    totalSessions: 0,
    presentSessions: 0,
    sessionAttendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const fetchAttendance = async () => {
    try {
      // Clear ALL previous data immediately
      setAttendanceRecords([]);
      setStats({ 
        totalDays: 0, 
        presentDays: 0, 
        absentDays: 0, 
        attendancePercentage: 0,
        totalSessions: 0,
        presentSessions: 0,
        sessionAttendanceRate: 0
      });

      // Student: fetch own attendance
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString();

      console.log('[ATTENDANCE] Fetching FRESH data for month:', selectedMonth.toLocaleDateString(), 'Range:', startDate, 'to', endDate);

      // Fetch both monthly records and overall stats
      const [monthlyData, overallData] = await Promise.all([
        getStudentAttendance(startDate, endDate), // Monthly records for calendar display
        getStudentAttendance() // Overall stats for percentage display
      ]);

      console.log('[ATTENDANCE] Monthly data returned:', monthlyData.records.length, 'records');
      console.log('[ATTENDANCE] Overall stats:', overallData.stats);

      // Only use the exact records returned from backend - no additional filtering
      const validRecords = monthlyData.records.filter(record => {
        // Only basic validation - ensure record has required fields
        return record && record.date && record.dateString;
      });

      console.log('[ATTENDANCE] Valid records after filtering:', validRecords.length);

      setAttendanceRecords(validRecords);
      
      // Use overall stats for the percentage display, but monthly stats for record counts
      setStats({
        totalDays: overallData.stats.totalDays,
        presentDays: overallData.stats.presentDays,
        absentDays: overallData.stats.absentDays,
        attendancePercentage: overallData.stats.attendancePercentage,
        totalSessions: overallData.stats.totalSessions || 0,
        presentSessions: overallData.stats.presentSessions || 0,
        sessionAttendanceRate: overallData.stats.sessionAttendanceRate || 0
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Ensure we clear data on error too
      setAttendanceRecords([]);
      setStats({ 
        totalDays: 0, 
        presentDays: 0, 
        absentDays: 0, 
        attendancePercentage: 0,
        totalSessions: 0,
        presentSessions: 0,
        sessionAttendanceRate: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // FORCE clear all data when month changes
    setAttendanceRecords([]);
    setStats({ 
      totalDays: 0, 
      presentDays: 0, 
      absentDays: 0, 
      attendancePercentage: 0,
      totalSessions: 0,
      presentSessions: 0,
      sessionAttendanceRate: 0
    });
    setLoading(true);

    // Add small delay to ensure state is cleared before fetching
    const timer = setTimeout(() => {
      fetchAttendance();
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedMonth]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const getCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    console.log('[CALENDAR] Building calendar for month:', month + 1, year);
    console.log('[CALENDAR] Available attendance records:', attendanceRecords.length);

    for (let i = 0; i < 42; i++) {
      // Use local date string to avoid timezone issues
      const year = currentDate.getFullYear();
      const month_num = currentDate.getMonth();
      const day_num = currentDate.getDate();
      const dateString = `${year}-${String(month_num + 1).padStart(2, '0')}-${String(day_num).padStart(2, '0')}`;

      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.toDateString() === new Date().toDateString();

      // STRICT matching - only show attendance if we have exact backend data
      let attendanceRecord = null;
      if (isCurrentMonth) {
        attendanceRecord = attendanceRecords.find(record => {
          const recordDateStr = record.dateString || record.date?.split('T')[0];
          const matches = recordDateStr === dateString;
          if (matches) {
            console.log('[CALENDAR] ✅ MATCHED attendance for date:', dateString, 'Day:', day_num, 'Status:', record.status);
          }
          return matches;
        });
      }

      days.push({
        date: currentDate.getDate(),
        dateString,
        isCurrentMonth,
        isToday,
        attendance: attendanceRecord || null
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Summary of matched attendance dates
    const datesWithAttendance = days.filter(day => day.attendance !== null);
    console.log('[CALENDAR] Generated', days.length, 'calendar days');
    console.log('[CALENDAR] Dates with attendance:', datesWithAttendance.map(day => `${day.date} (${day.dateString})`));

    return days;
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + direction, 1);
    setSelectedMonth(newMonth);
  };

  const getDateStyle = (day: { isCurrentMonth: boolean; isToday: boolean }) => {
    const composed = [calendarStyles.dateText];
    if (!day.isCurrentMonth) composed.push(calendarStyles.otherMonthText);
    if (day.isToday) composed.push(calendarStyles.todayText);
    return composed;
  };

  const getDateContainerStyle = (day: { date: number; isCurrentMonth: boolean }) => {
    const composed = [calendarStyles.dateContainer];
    if (day.date === selectedDate && day.isCurrentMonth) composed.push(calendarStyles.selectedDate);
    return composed;
  };

  const monthYear = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.headerSubtitle, { marginTop: 12 }]}>Loading attendance...</Text>
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
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton} onPress={() => changeMonth(-1)}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthYear}>{monthYear}</Text>
              <TouchableOpacity style={styles.navButton} onPress={() => changeMonth(1)}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={calendarStyles.daysOfWeekContainer}>
              {daysOfWeek.map((day, index) => (
                <View key={index} style={calendarStyles.dayOfWeekCell}>
                  <Text style={calendarStyles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={calendarStyles.calendarGrid}>
              {getCalendarDays().map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={getDateContainerStyle(day)}
                  onPress={() => day.isCurrentMonth && setSelectedDate(day.date)}
                >
                  <Text style={getDateStyle(day)}>{day.date}</Text>
                  {day.isCurrentMonth && day.attendance && (
                    <View style={calendarStyles.statusDot}>
                      {/* Morning session dot */}
                      <View style={[calendarStyles.dot, {
                        backgroundColor: 
                          day.attendance?.sessions?.morning?.status === 'present' ? '#4ADE80' :
                          day.attendance?.sessions?.morning?.status === 'absent' ? '#EF4444' :
                          day.attendance?.sessions?.morning === null ? '#D1D5DB' :
                          day.attendance?.status === 'present' ? '#4ADE80' :
                          day.attendance?.status === 'absent' ? '#EF4444' :
                          day.attendance?.status === 'no-class' ? '#9CA3AF' :
                          '#F3F4F6'
                      }]} />
                      {/* Afternoon session dot */}
                      <View style={[calendarStyles.dot, {
                        backgroundColor: 
                          day.attendance?.sessions?.afternoon?.status === 'present' ? '#4ADE80' :
                          day.attendance?.sessions?.afternoon?.status === 'absent' ? '#EF4444' :
                          day.attendance?.sessions?.afternoon === null ? '#D1D5DB' :
                          day.attendance?.status === 'present' ? '#4ADE80' :
                          day.attendance?.status === 'absent' ? '#EF4444' :
                          day.attendance?.status === 'no-class' ? '#9CA3AF' :
                          '#F3F4F6'
                      }]} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#D1D5DB' }]} />
                <Text style={styles.legendText}>No Session</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
                <Text style={styles.legendText}>No Class</Text>
              </View>
            </View>

            <View style={styles.sessionLegendContainer}>
              <Text style={styles.sessionLegendTitle}>Session Indicators:</Text>
              <View style={styles.sessionLegendRow}>
                <Text style={styles.sessionLegendText}>Left dot: Morning • Right dot: Afternoon</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sessionInfo}>Attendance tracking for {monthYear}</Text>
            {attendanceRecords.length === 0 && (
              <View style={styles.noRecordsContainer}>
                <Text style={styles.noRecordsText}>No attendance records found</Text>
                <Text style={styles.noRecordsSubtext}>Your attendance will appear here once your teacher starts marking attendance</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.attendanceCircleContainer}>
              <View style={styles.attendanceCircle}>
                <View style={styles.circleInner}>
                  <Text style={styles.attendancePercentage}>
                    {(stats.attendancePercentage || 0).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.attendanceStats}>
              <View style={styles.attendanceStat}>
                <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                <View>
                  <Text style={styles.attendanceStatLabel}>Attended</Text>
                  <Text style={styles.attendanceStatValue}>
                    {stats.presentDays}/{stats.totalDays} days
                  </Text>
                  {stats.totalSessions !== undefined && (
                    <Text style={styles.attendanceStatValue}>
                      {stats.presentSessions}/{stats.totalSessions} sessions
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    scrollView: { flex: 1 },
    header: { padding: 20, paddingTop: 10, alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    headerSubtitle: { fontSize: 14, color: isDark ? '#9CA3AF' : '#1E3A8A', marginTop: 4 },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 12 },
    calendarCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navButton: { padding: 8 },
    navButtonText: { fontSize: 24, color: isDark ? '#93C5FD' : '#1E3A8A', fontWeight: '600' },
    monthYear: { fontSize: 18, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A' },
    legendContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
    legendText: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '500' },
    divider: { height: 1, backgroundColor: isDark ? '#1F2937' : '#E5E7EB', marginVertical: 12 },
    sessionInfo: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' },
    overviewCard: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD', flexDirection: 'row', alignItems: 'center' },
    attendanceCircleContainer: { marginRight: 20 },
    attendanceCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#4ADE80', borderRightColor: '#EF4444', borderBottomColor: '#EF4444', justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#111827' : '#FFFFFF' },
    circleInner: { justifyContent: 'center', alignItems: 'center' },
    attendancePercentage: { fontSize: 24, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' },
    attendanceStats: { flex: 1 },
    attendanceStat: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
    attendanceStatLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937' },
    attendanceStatValue: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' },
    sessionLegendContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#E5E7EB' },
    sessionLegendTitle: { fontSize: 12, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 4 },
    sessionLegendRow: { alignItems: 'center' },
    sessionLegendText: { fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' },
    noRecordsContainer: { alignItems: 'center', paddingVertical: 20, marginTop: 12 },
    noRecordsText: { fontSize: 14, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4 },
    noRecordsSubtext: { fontSize: 12, color: isDark ? '#6B7280' : '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },
  });
}

function getCalendarStyles(isDark: boolean) {
  return StyleSheet.create({
    daysOfWeekContainer: { flexDirection: 'row', marginBottom: 8 },
    dayOfWeekCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    dayOfWeekText: { fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E3A8A' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dateContainer: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
    selectedDate: { backgroundColor: isDark ? '#1F2937' : '#DBEAFE', borderRadius: 8 },
    dateText: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937' },
    otherMonthText: { color: isDark ? '#374151' : '#D1D5DB' },
    todayText: { color: '#3B82F6', fontWeight: '700' },
    statusDot: { position: 'absolute', bottom: 4, flexDirection: 'row', gap: 2 },
    dot: { width: 6, height: 6, borderRadius: 3 },
  });
}
