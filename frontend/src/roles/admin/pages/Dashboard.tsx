import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, UserCheck, BookOpen, TrendingUp, Calendar, Clock, AlertCircle, Building, Phone, Mail, MapPin, RefreshCw, Bug, AlertTriangle, UserPlus, CheckCircle2, FileText, Megaphone, CreditCard, MessageSquare, Database, Activity } from 'lucide-react';
import { schoolAPI } from '../../../services/api';
import { schoolUserAPI } from '../../../api/schoolUsers';
import api from '../../../services/api';
import { useAuth } from '../../../auth/AuthContext';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

interface School {
  _id: string;
  name: string;
  code: string;
  logoUrl?: string;
  principalName?: string;
  principalEmail?: string;
  mobile?: string;
  address?: {
    street?: string;
    area?: string;
    city?: string;
    district?: string;
    taluka?: string;
    state?: string;
    stateId?: number;
    districtId?: number;
    talukaId?: number;
    country?: string;
    zipCode?: string;
    pinCode?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    accountHolderName?: string;
  };
  settings?: {
    academicYear?: {
      startDate?: Date;
      endDate?: Date;
      currentYear?: string;
    };
    classes?: string[];
    sections?: string[];
    subjects?: string[];
    workingDays?: string[];
    workingHours?: {
      start?: string;
      end?: string;
    };
    holidays?: Array<{
      date?: Date;
      description?: string;
    }>;
  };
  stats?: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    totalClasses: number;
  };
  features?: {
    hasTransport?: boolean;
    hasCanteen?: boolean;
    hasLibrary?: boolean;
    hasSports?: boolean;
    hasComputerLab?: boolean;
  };
  schoolType?: string;
  establishedYear?: number;
  affiliationBoard?: string;
  website?: string;
  secondaryContact?: string;
  isActive?: boolean;
  establishedDate?: Date;
  admins?: string[];
  databaseName?: string;
  databaseCreated?: boolean;
  databaseCreatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState({ student: 0, teacher: 0, parent: 0, admin: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [attendanceRate, setAttendanceRate] = useState<string>('0.0%');
  const [dailyAttendance, setDailyAttendance] = useState<Array<{ name: string, attendance: number }>>([]);
  const [todayAttendance, setTodayAttendance] = useState<{ present: number, absent: number }>({ present: 0, absent: 0 });
  const [morningAttendance, setMorningAttendance] = useState<{ present: number, absent: number }>({ present: 0, absent: 0 });
  const [afternoonAttendance, setAfternoonAttendance] = useState<{ present: number, absent: number }>({ present: 0, absent: 0 });
  const [classPerformance, setClassPerformance] = useState<Array<{ name: string, percentage: number, studentCount: number }>>([]);
  const [sosAlerts, setSOSAlerts] = useState<Array<any>>([]);
  const socketRef = useRef<Socket | null>(null);
  const [showSOSAlerts, setShowSOSAlerts] = useState(true);
  const [dashboardOverview, setDashboardOverview] = useState<any>(null);

  // Get auth token - improved to use AuthContext first
  const getAuthToken = () => {
    // First try the token from AuthContext
    if (token) {
      return token;
    }

    // Then try localStorage with the correct key
    try {
      const authData = localStorage.getItem('erp.auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.token;
      }
    } catch (e) {
      console.warn('Failed to parse auth data from localStorage:', e);
    }

    // Fallback to old storage methods
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  useEffect(() => {
    const fetchSchoolAndUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const debug: any = {
          user: user,
          schoolIdentifier: user?.schoolId || user?.schoolCode,
          token: !!getAuthToken(),
          timestamp: new Date().toISOString()
        };

        console.log('🔍 Starting fetchSchoolAndUsers with debug info:', debug);
        setDebugInfo(debug);

        // Check if we have a valid school identifier
        const schoolIdentifier = user?.schoolId || user?.schoolCode;
        if (!schoolIdentifier) {
          throw new Error(`No school identifier found. Please log out and log back in to refresh your school association.`);
        }

        if (schoolIdentifier) {
          const token = getAuthToken();
          if (!token) {
            throw new Error('No authentication token found. Please log in again.');
          }

          try {
            // Try to fetch school details from school_info collection in school's database
            console.log('📡 Fetching school details from school_info collection');
            try {
              const schoolResponse = await api.get('/schools/database/school-info');
              console.log('✅ School response from school_info:', schoolResponse);

              // Extract data from nested response structure
              const schoolData = schoolResponse.data?.data || schoolResponse.data;
              console.log('📊 Extracted school data:', schoolData);
              setSchool(schoolData);

              debug.schoolFetch = { success: true, source: 'school_info', schoolName: schoolData?.name };
            } catch (schoolInfoErr: any) {
              // Fallback to main database if school_info collection fails
              console.warn('⚠️ Failed to fetch from school_info, trying main database:', schoolInfoErr.message);
              const fallbackResponse = await api.get(`/schools/${schoolIdentifier}/info`);
              console.log('✅ School response from main database:', fallbackResponse);

              const schoolData = fallbackResponse.data?.data || fallbackResponse.data;
              console.log('📊 Extracted school data (fallback):', schoolData);
              setSchool(schoolData);

              debug.schoolFetch = { success: true, source: 'main_database', schoolName: schoolData?.name };
            }
          } catch (schoolErr: any) {
            console.error('❌ Error fetching school:', schoolErr);
            console.error('❌ Error details:', schoolErr.response?.data);
            debug.schoolFetch = {
              success: false,
              error: schoolErr.message,
              status: schoolErr.response?.status,
              data: schoolErr.response?.data
            };
            // Don't set error state yet, continue with users
          }

          try {
            // Fetch school users using the correct API
            // Use schoolCode (P) for the API call, not schoolId (ObjectId)
            const schoolCodeForAPI = user?.schoolCode || 'P';
            console.log('📡 Fetching limited users for dashboard:', schoolCodeForAPI);
            // Limit to 5 for the dashboard recent users list
            const usersResponse = await api.get(`/school-users/${schoolCodeForAPI}/users?limit=5&academicYear=${user?.academicYear || ''}`);
            console.log('✅ Limited users response:', usersResponse);

            // Handle the new flat array format
            let allUsers: any[] = [];
            if (usersResponse && usersResponse.data && Array.isArray(usersResponse.data)) {
              // New format: flat array in data field
              allUsers = usersResponse.data;
            } else if (usersResponse && typeof usersResponse === 'object') {
              // Old format: grouped by role (fallback)
              const roles = ['admin', 'teacher', 'student', 'parent'];
              for (const role of roles) {
                if (usersResponse[role] && Array.isArray(usersResponse[role])) {
                  allUsers.push(...usersResponse[role].map((user: any) => ({ ...user, role })));
                }
              }
            }

            // Normalize user objects so `name` is always a string (displayName or first+last)
            const normalized = allUsers.map(u => {
              const userObj: any = { ...u };
              if (userObj.name && typeof userObj.name === 'object') {
                userObj.name = userObj.name.displayName || (((userObj.name.firstName || '') + ' ' + (userObj.name.lastName || '')).trim()) || userObj.email;
              }
              return userObj;
            });
            setUsers(normalized);

            // Save the real counts from the backend's breakdown
            const apiBreakdown = usersResponse?.data?.breakdown || (usersResponse as any)?.breakdown;
            if (apiBreakdown) {
              setUserStats({
                student: apiBreakdown.student || 0,
                teacher: apiBreakdown.teacher || 0,
                parent: apiBreakdown.parent || 0,
                admin: apiBreakdown.admin || 0
              });
            }

            debug.usersFetch = {
              success: true,
              totalUsers: allUsers.length,
              breakdown: allUsers.reduce((acc: Record<string, number>, user: any) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
              }, {})
            };

          } catch (userErr: any) {
            console.error('❌ Error fetching users:', userErr);
            debug.usersFetch = {
              success: false,
              error: userErr.message,
              status: userErr.response?.status,
              data: userErr.response?.data
            };
            throw userErr; // Propagate user fetch errors
          }

          try {
            const overviewResponse = await api.get(`/schools/${user?.schoolId || user?.schoolCode}/dashboard-overview`);
            if (overviewResponse.data?.success) {
              setDashboardOverview(overviewResponse.data.data);
            }
          } catch (e) {
            console.error('Error fetching dashboard overview:', e);
          }

          setDebugInfo({ ...debug });

        } else {
          // No school information in user object
          console.log('⚠️  User object:', user);
          debug.noSchoolInfo = true;

          if (user?.role === 'superadmin') {
            // SuperAdmin doesn't need school information
            setError(null);
            setSchool(null);
            setUsers([]);
            debug.superadminMode = true;
          } else {
            setError('No school associated with this account. Please contact support.');
            console.error('❌ No schoolId or schoolCode found in user object:', user);
            debug.missingSchoolAssociation = true;
          }

          setDebugInfo({ ...debug });
        }
      } catch (err: any) {
        console.error('💥 Error in fetchSchoolAndUsers:', err);
        setError(`Failed to load school information: ${err.message}`);
        setDebugInfo({
          ...debugInfo,
          generalError: {
            message: err.message,
            stack: err.stack,
            response: err.response?.data
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolAndUsers();

    // Initialize Socket.IO connection for SOS alerts
    console.log('[DASHBOARD] User data:', user);
    console.log('[DASHBOARD] School code:', user?.schoolCode);
    console.log('[DASHBOARD] Socket ref exists:', !!socketRef.current);

    if (user?.schoolCode && !socketRef.current) {
      const socketUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5050';
      console.log('🔌 [DASHBOARD] Connecting to socket server:', socketUrl);
      console.log('🔌 [DASHBOARD] Will join school room:', user.schoolCode);

      socketRef.current = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      socketRef.current.on('connect', () => {
        console.log('✅ [DASHBOARD] Socket connected! ID:', socketRef.current?.id);
        if (user.schoolCode) {
          socketRef.current?.emit('join-school', user.schoolCode);
          console.log('📚 [DASHBOARD] Emitted join-school event for:', user.schoolCode);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ [DASHBOARD] Socket connection error:', error.message);
      });

      socketRef.current.on('sos-alert', (alert: any) => {
        console.log('🚨🚨🚨 [DASHBOARD] SOS ALERT RECEIVED!', alert);
        console.log('[DASHBOARD] Current alerts before adding:', sosAlerts);

        // Add to alerts list
        setSOSAlerts(prev => {
          console.log('[DASHBOARD] Adding alert to list. Previous:', prev);
          const newAlerts = [alert, ...prev];
          console.log('[DASHBOARD] New alerts list:', newAlerts);
          return newAlerts;
        });

        // Show toast notification
        console.log('[DASHBOARD] Showing toast notification...');
        toast.error(
          `🚨 EMERGENCY: ${alert.studentName} (${alert.studentClass}) has sent an SOS alert!`,
          {
            duration: 10000,
            position: 'top-center',
            style: {
              background: '#DC2626',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
              padding: '16px',
              borderRadius: '8px'
            }
          }
        );
        console.log('[DASHBOARD] Toast notification triggered');

        // Play alert sound if available
        try {
          const audio = new Audio('/alert-sound.mp3');
          audio.play().catch(e => console.log('Could not play alert sound:', e));
        } catch (e) {
          console.log('Audio not available');
        }
      });

      socketRef.current.on('sos-acknowledged', (data: any) => {
        console.log('✅ [DASHBOARD] SOS acknowledged:', data);
        setSOSAlerts(prev => prev.filter(alert => alert.id !== data.alertId));
        toast.success(`SOS alert acknowledged by ${data.adminName}`);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 [DASHBOARD] Socket disconnected. Reason:', reason);
      });

      console.log('✅ [DASHBOARD] Socket event listeners registered');
    } else {
      console.log('⚠️ [DASHBOARD] Socket not initialized. Reasons:');
      console.log('  - Has schoolCode?', !!user?.schoolCode);
      console.log('  - Socket already exists?', !!socketRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);
  console.log(user);

  // Fetch today's attendance rate only
  useEffect(() => {
    const fetchAttendanceStats = async () => {
      try {
        const token = getAuthToken();
        if (!token || !user?.schoolCode) return;

        const today = new Date().toISOString().split('T')[0];
        console.log('📊 Fetching today\'s attendance rate for:', today);

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/stats?date=${today}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('📊 Today\'s attendance data:', data);

          if (data.success) {
            const totalStudents = (data.presentCount || 0) + (data.absentCount || 0);
            if (totalStudents > 0) {
              const rate = ((data.presentCount || 0) / totalStudents * 100).toFixed(1);
              setAttendanceRate(`${rate}%`);
            } else {
              setAttendanceRate('0.0%');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching today\'s attendance rate:', err);
        // Keep default value on error
      }
    };

    fetchAttendanceStats();
  }, [user]);

  // Fetch today's attendance for pie chart (both sessions)
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const token = getAuthToken();
        if (!token || !user?.schoolCode) return;

        const today = new Date().toISOString().split('T')[0];
        console.log('📊 Fetching today\'s attendance for:', today);

        // Fetch overall today's attendance
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/stats?date=${today}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('📊 Today\'s attendance data:', data);

          if (data.success) {
            setTodayAttendance({
              present: data.presentCount || 0,
              absent: data.absentCount || 0
            });
          }
        }

        // Fetch morning session data
        const morningResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/session-data?date=${today}&session=morning`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (morningResponse.ok) {
          const morningData = await morningResponse.json();
          console.log('🌅 Morning attendance data:', morningData);

          if (morningData.success) {
            setMorningAttendance({
              present: morningData.presentCount || 0,
              absent: morningData.absentCount || 0
            });
          }
        }

        // Fetch afternoon session data
        const afternoonResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/session-data?date=${today}&session=afternoon`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (afternoonResponse.ok) {
          const afternoonData = await afternoonResponse.json();
          console.log('🌆 Afternoon attendance data:', afternoonData);

          if (afternoonData.success) {
            setAfternoonAttendance({
              present: afternoonData.presentCount || 0,
              absent: afternoonData.absentCount || 0
            });
          }
        }
      } catch (err) {
        console.error('Error fetching today\'s attendance:', err);
      }
    };

    fetchTodayAttendance();
  }, [user]);

  // Fetch daily attendance data for the weekly graph
  useEffect(() => {
    const fetchDailyAttendance = async () => {
      try {
        const token = getAuthToken();
        if (!token || !user?.schoolCode) return;

        // Get last 7 days
        const today = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          last7Days.push(date);
        }

        console.log('📅 Fetching attendance for last 7 days');

        // Fetch attendance data from backend
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/daily-stats?schoolCode=${user.schoolCode}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('📅 Daily attendance data:', data);

          if (data.success && data.dailyStats) {
            // Format data for the chart
            const formattedData = data.dailyStats.map((day: any) => ({
              name: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
              attendance: day.attendanceRate || 0,
              date: day.date
            }));
            setDailyAttendance(formattedData);
          } else {
            // Fallback: create chart with last 7 days showing 0%
            const fallbackData = last7Days.map(date => ({
              name: date.toLocaleDateString('en-US', { weekday: 'short' }),
              attendance: 0,
              date: date.toISOString().split('T')[0]
            }));
            setDailyAttendance(fallbackData);
          }
        } else {
          // Fallback data
          const fallbackData = last7Days.map(date => ({
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            attendance: 0,
            date: date.toISOString().split('T')[0]
          }));
          setDailyAttendance(fallbackData);
        }
      } catch (err) {
        console.error('Error fetching daily attendance:', err);
        // Fallback to showing last 7 days with 0%
        const today = new Date();
        const fallbackData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          fallbackData.push({
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            attendance: 0,
            date: date.toISOString().split('T')[0]
          });
        }
        setDailyAttendance(fallbackData);
      }
    };

    fetchDailyAttendance();
  }, [user]);

  // Fetch class performance data
  useEffect(() => {
    const fetchClassPerformance = async () => {
      try {
        const token = getAuthToken();
        if (!token || !user?.schoolCode) return;

        console.log('📊 Fetching class performance data');

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/results/class-performance-stats`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log('📊 Class performance data:', result);

          if (result.success && result.data) {
            setClassPerformance(result.data);
          }
        }
      } catch (err) {
        console.error('Error fetching class performance:', err);
      }
    };

    fetchClassPerformance();
  }, [user]);


  // Helper function to get full logo URL
  const getLogoUrl = (logoPath: string | undefined): string => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string);
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      return `${baseUrl}${logoPath}`;
    }
    return logoPath;
  };

  // Handle SOS alert acknowledgment
  const handleAcknowledgeSOS = (alertId: string) => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('acknowledge-sos', {
      alertId,
      schoolCode: user.schoolCode,
      adminId: user.id,
      adminName: user.name || 'Admin'
    });

    // Remove from local state
    setSOSAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Dismiss SOS alert without acknowledging
  const handleDismissSOS = (alertId: string) => {
    setSOSAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Calculate stats from API breakdown first, then school.stats, then fallback to users array
  const totalStudents = userStats.student > 0 ? userStats.student : (school?.stats?.totalStudents ?? users.filter(user => user.role === 'student').length);
  const totalTeachers = userStats.teacher > 0 ? userStats.teacher : (school?.stats?.totalTeachers ?? users.filter(user => user.role === 'teacher').length);

  // Get total classes from stats, fallback to the settings array length, and finally 0 if none exist
  const totalClasses = school?.stats?.totalClasses || school?.settings?.classes?.length || 0;

  // Use real data from the school or fallback to sample data
  const stats = [
    { 
      name: 'Total Students', 
      value: totalStudents.toString(), 
      subtitle: '↑ 12 this month', 
      subtitleColor: 'text-green-500',
      icon: Users, 
      bgColor: 'bg-purple-100', 
      iconColor: 'text-purple-600' 
    },
    { 
      name: 'Attendance Rate', 
      value: attendanceRate, 
      subtitle: 'Excellent', 
      subtitleColor: 'text-green-500',
      icon: UserCheck, 
      bgColor: 'bg-green-100', 
      iconColor: 'text-green-600' 
    },
    { 
      name: 'Total Teachers', 
      value: totalTeachers.toString(), 
      subtitle: 'Active', 
      subtitleColor: 'text-indigo-600',
      icon: Users, 
      bgColor: 'bg-blue-100', 
      iconColor: 'text-blue-600' 
    },
    { 
      name: 'Total Classes', 
      value: totalClasses.toString(), 
      subtitle: 'Across all grades', 
      subtitleColor: 'text-slate-500',
      icon: BookOpen, 
      bgColor: 'bg-orange-100', 
      iconColor: 'text-orange-500' 
    },
  ];

  // Use dynamic daily attendance data
  const attendanceData = dailyAttendance.length > 0 ? dailyAttendance : [
    { name: 'Mon', attendance: 0 },
    { name: 'Tue', attendance: 0 },
    { name: 'Wed', attendance: 0 },
    { name: 'Thu', attendance: 0 },
    { name: 'Fri', attendance: 0 },
    { name: 'Sat', attendance: 0 },
    { name: 'Sun', attendance: 0 },
  ];

  // Dynamic pie data for morning session
  const morningPieData = [
    { name: 'Present', value: morningAttendance.present, color: '#10B981' },
    { name: 'Absent', value: morningAttendance.absent, color: '#EF4444' },
  ];

  // Dynamic pie data for afternoon session
  const afternoonPieData = [
    { name: 'Present', value: afternoonAttendance.present, color: '#10B981' },
    { name: 'Absent', value: afternoonAttendance.absent, color: '#EF4444' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">Loading school data...</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700 font-medium">Error Loading Data</p>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
              {!getAuthToken() && (
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Login Again
                </button>
              )}
            </div>
          </div>

          {/* Debug Panel */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Bug className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">Debug Information</h3>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showDebug ? 'Hide' : 'Show'} Details
              </button>
            </div>

            {showDebug && debugInfo && (
              <div className="bg-white p-3 rounded border text-xs">
                <pre className="whitespace-pre-wrap overflow-x-auto text-gray-600">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              <p>User Role: {user?.role}</p>
              <p>School ID: {user?.schoolId || 'Not found'}</p>
              <p>School Code: {user?.schoolCode || 'Not found'}</p>
              <p>Token Available: {!!getAuthToken() ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
                Welcome back, {user?.name || 'Admin'} 👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">Here's what's happening in {school?.name || user?.schoolName || 'your school'} today.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600 font-medium">
                <Calendar className="h-4 w-4 text-slate-400" />
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* SOS Alerts Section */}
          {sosAlerts.length > 0 && showSOSAlerts && (
            <div className="space-y-3">
              {sosAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-50 border-2 border-red-500 rounded-lg p-4 shadow-lg animate-pulse"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-bold text-red-900">
                            🚨 EMERGENCY SOS ALERT
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white animate-pulse">
                            URGENT
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-red-800">
                          <p className="font-semibold text-base">
                            Student: <span className="text-red-900">{alert.studentName}</span>
                          </p>
                          <p>
                            Class: <span className="font-medium">{alert.studentClass}</span>
                            {alert.studentRollNo && (
                              <span className="ml-3">Roll No: <span className="font-medium">{alert.studentRollNo}</span></span>
                            )}
                          </p>
                          {alert.studentMobile && alert.studentMobile !== 'N/A' && (
                            <p>
                              Mobile: <a href={`tel:${alert.studentMobile}`} className="font-medium text-red-900 hover:underline">{alert.studentMobile}</a>
                            </p>
                          )}
                          <p>
                            Time: <span className="font-medium">{new Date(alert.timestamp).toLocaleString()}</span>
                          </p>
                          {alert.location && (
                            <p>
                              Location: <span className="font-medium">{alert.location}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleAcknowledgeSOS(alert.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleDismissSOS(alert.id)}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* School Info Header */}
          <div className="relative bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-2xl shadow-md border border-indigo-500/30 overflow-hidden mb-2">
            {/* Background SVG Watermark */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
              <Building className="w-64 h-64 text-white" />
            </div>

            <div className="p-5 sm:p-7 relative z-10">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* School Logo */}
                {school?.logoUrl || true ? (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-xl p-2 flex-shrink-0 shadow-lg flex items-center justify-center">
                    <img
                      src={school?.logoUrl ? getLogoUrl(school.logoUrl) : '/logo.png'}
                      alt={`${school?.name || 'School'} logo`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : null}

                {/* School Info */}
                <div className="flex-grow text-center md:text-left mt-2 md:mt-0 flex flex-col justify-center h-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{school?.name || user?.schoolName || 'Vidyaniketan High School'}</h2>
                    {school?.affiliationBoard && (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/10">
                        {school.affiliationBoard}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start justify-center md:justify-start text-indigo-100">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-indigo-200" />
                      <span className="text-sm font-medium">
                        {school?.address?.street && school?.address?.city
                          ? `${school.address.street}, ${school.address.city}`
                          : school?.address?.street || school?.address?.city || 'No. 56, 9th Main Road, Rajkumar Road, Bangalore, Karnataka - 560010'}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 text-indigo-100 text-sm font-medium">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-indigo-200" />
                        {school?.contact?.phone || school?.mobile || '7026370266'}
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-indigo-200" />
                        {school?.contact?.email || school?.principalEmail || 'md@ssinphinite.org'}
                      </div>
                      {(school?.contact?.website || school?.website) && (
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-200">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" x2="22" y1="12" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          </svg>
                          <a href={(school.contact?.website || school.website)?.startsWith('http') ? (school.contact?.website || school.website) : `https://${school.contact?.website || school.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                            {school.contact?.website || school.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className={`${stat.bgColor} p-4 rounded-full flex items-center justify-center shrink-0`}>
                  <stat.icon className={`h-7 w-7 ${stat.iconColor}`} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.name}</p>
                  <p className="text-2xl font-bold text-slate-800 mb-1">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.subtitleColor}`}>{stat.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top Row: Enrollment, Recent Activities, Grade Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 items-start">
            
            {/* Student Enrollment Overview */}
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-800">Student Enrollment Overview</h3>
                <select className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-600 focus:outline-none">
                  <option>This Year</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dashboardOverview?.enrollmentOverview || []}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="students" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} fillOpacity={1} fill="url(#colorStudents)" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Recent Activities */}
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold text-slate-800">Recent Activities</h3>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View All</a>
              </div>
              <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                {(dashboardOverview?.recentActivities || []).length > 0 ? (
                  dashboardOverview.recentActivities.map((activity: any, i: number) => {
                    const icons: any = { UserPlus, CheckCircle2, BookOpen, FileText, Megaphone };
                    const Icon = icons[activity.icon] || FileText;
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{activity.text}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(activity.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500 text-center py-4">No recent activities</div>
                )}
              </div>
            </motion.div>

            {/* Students by Grade */}
            <motion.div variants={itemVariants} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 lg:col-span-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-semibold text-slate-800">Students by Grade</h3>
                <select className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-600 focus:outline-none">
                  <option>All Grades</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col justify-center relative mt-4 min-h-[160px]">
                <div className="w-full flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center sm:items-stretch lg:items-center xl:items-stretch gap-4 sm:gap-0 lg:gap-4 xl:gap-0">
                  <div className="w-full sm:w-1/2 lg:w-full xl:w-1/2 h-[160px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardOverview?.studentsByGrade || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {
                            (dashboardOverview?.studentsByGrade || []).map((entry: any, index: number) => {
                              const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#d946ef'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })
                          }
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-slate-800">{dashboardOverview?.totalStudents || 0}</span>
                      <span className="text-xs text-slate-500">Total</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2 lg:w-full xl:w-1/2 flex flex-col gap-2 sm:pl-4 lg:pl-0 xl:pl-4 max-h-[160px] lg:max-h-none xl:max-h-[160px] overflow-y-auto pr-1 no-scrollbar justify-center">
                    {(dashboardOverview?.studentsByGrade || []).map((grade: any, i: number) => {
                      const colors = ['bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-fuchsia-500'];
                      const pct = dashboardOverview?.totalStudents ? ((grade.value / dashboardOverview.totalStudents) * 100).toFixed(1) + '%' : '0%';
                      return (
                        <div key={grade.name} className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${colors[i % colors.length]}`}></span>
                            <span className="text-slate-600 font-medium truncate" title={grade.name}>{grade.name}</span>
                          </div>
                          <div className="flex gap-2 sm:gap-3 items-center shrink-0">
                            <span className="font-bold text-slate-800 w-6 text-right">{grade.value}</span>
                            <span className="text-slate-400 font-medium w-8 text-right">{pct}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="text-right mt-4">
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View Detailed Report →</a>
              </div>
            </motion.div>

          </div>

          {/* Bottom Row: Quick Actions, System Overview, Notice Board */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 items-start">
            
            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <h3 className="text-base font-semibold text-slate-800 mb-5">Quick Actions</h3>
              <div className="grid grid-cols-5 gap-2">
                <Link to="/admin/users" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <UserPlus className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] text-center font-medium text-slate-600 group-hover:text-purple-700">Add Student</span>
                </Link>
                <Link to="/admin/academic-details" state={{ tab: 'hallticket' }} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] text-center font-medium text-slate-600 group-hover:text-emerald-700">Hall Ticket</span>
                </Link>
                <Link to="/admin/reports" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] text-center font-medium text-slate-600 group-hover:text-blue-700">Generate Report</span>
                </Link>
                <Link to="/admin/fees/payments" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-[10px] text-center font-medium text-slate-600 group-hover:text-orange-700">Collect Fees</span>
                </Link>
                <Link to="/admin/messages" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] text-center font-medium text-slate-600 group-hover:text-purple-700">Send Message</span>
                </Link>
              </div>
            </motion.div>

            {/* System Overview */}
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <h3 className="text-base font-semibold text-slate-800 mb-5">School Operations</h3>
              <div className="grid grid-cols-4 gap-4 sm:gap-6 mt-2">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                      <Database className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xl font-bold text-slate-800">{dashboardOverview?.systemOverview?.seatUtilization || 0}%</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Seat Utilization</span>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${dashboardOverview?.systemOverview?.seatUtilization || 0}%` }}></div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xl font-bold text-slate-800">{dashboardOverview?.systemOverview?.attendanceSync || 0}%</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Attendance Synced</span>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dashboardOverview?.systemOverview?.attendanceSync || 0}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xl font-bold text-slate-800">{dashboardOverview?.systemOverview?.parentRegistration || 0}%</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Parent Accounts</span>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dashboardOverview?.systemOverview?.parentRegistration || 0}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xl font-bold text-slate-800">{dashboardOverview?.systemOverview?.activeStaff || 0}%</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Active Staff</span>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dashboardOverview?.systemOverview?.activeStaff || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Notice Board */}
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-slate-800">Notice Board</h3>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View All</a>
              </div>
              <div className="space-y-4">
                {(dashboardOverview?.notices || []).length > 0 ? (
                  dashboardOverview.notices.slice(0, 2).map((notice: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 mt-1">
                        <Megaphone className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{notice.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{notice.message || notice.content || 'No details provided.'}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">{new Date(notice.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 text-center py-4">No recent notices</div>
                )}
              </div>
            </motion.div>

          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-between items-center text-xs text-slate-400 mb-4 px-2">
            <p>© 2026 GoodSynk ERP. All rights reserved.</p>
            <p>Version 2.0.0</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
