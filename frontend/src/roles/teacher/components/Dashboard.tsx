import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
  ClipboardCheck,
  Send,
  BarChart3,
  GraduationCap,
  UserPlus,
  Home
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../../auth/AuthContext';
import ViewAssignmentModal from './Assignments/ViewAssignmentModal';
import api from '../../../services/api';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface DashboardStats {
  totalAssignments: number;
  activeAssignments: number;
  leaveRequests: {
    total: number;
    pending: number;
    approved: number;
  };
}

interface ClassCount {
  className: string;
  section: string;
  count: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    leaveRequests: { total: 0, pending: 0, approved: 0 }
  });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [classCounts, setClassCounts] = useState<ClassCount[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (currentAcademicYear) {
      fetchDashboardData(currentAcademicYear);
    }
  }, [currentAcademicYear]);

  const fetchDashboardData = async (academicYear: string) => {
    setLoading(true);
    try {
      // Assignments
      let assignmentsData: any = { assignments: [] };
      let totalAssignments = 0;
      try {
        const assignmentsRes = await api.get(`/assignments?limit=10&page=1&academicYear=${academicYear}`);
        assignmentsData = assignmentsRes.data;
        totalAssignments = assignmentsData.total || (assignmentsData.assignments || []).length;
      } catch (error) {
        console.warn('⚠️ Assignments API failed:', error);
      }

      // Leave requests
      let leaveData: any = { data: { leaveRequests: [] } };
      try {
        const leaveRes = await api.get('/leave-requests/teacher/my-requests');
        leaveData = leaveRes.data;
      } catch (error) {
        console.warn('⚠️ Leave requests API failed:', error);
      }

      // Messages
      try {
        const messagesRes = await api.get('/messages/teacher/messages?limit=5');
        const messagesData = messagesRes.data;
        setMessages(messagesData.messages || messagesData.data || []);
      } catch (error) {
        console.warn('⚠️ Messages API failed:', error);
      }

      // Class / student counts
      try {
        const classRes = await api.get('/users/stats/student-counts', { params: { academicYear } });
        if (classRes.data?.success) {
          setClassCounts(classRes.data.data || []);
        }
      } catch (error) {
        console.warn('⚠️ Class counts API failed:', error);
      }

      // Weekly attendance trend (last 7 days, school-wide)
      try {
        const trendRes = await api.get('/attendance/daily-stats');
        const dailyStats = trendRes.data?.dailyStats || [];
        setAttendanceTrend(
          dailyStats.map((d: any) => ({
            day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
            rate: d.attendanceRate || 0
          }))
        );
      } catch (error) {
        console.warn('⚠️ Attendance trend API failed:', error);
      }

      const assignmentsArray = (assignmentsData.assignments || []).filter((a: any) => a && typeof a === 'object');
      const leaveRequestsArray = leaveData.data?.leaveRequests || [];

      setAssignments(assignmentsArray.slice(0, 4));
      setLeaveRequests(leaveRequestsArray);

      const activeAssignments = assignmentsArray.filter((a: any) => {
        const dueDate = new Date(a.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate >= today;
      }).length;

      setStats({
        totalAssignments,
        activeAssignments,
        leaveRequests: {
          total: leaveRequestsArray.length,
          pending: leaveRequestsArray.filter((l: any) => l.status === 'pending').length,
          approved: leaveRequestsArray.filter((l: any) => l.status === 'approved').length
        }
      });
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = classCounts.reduce((sum, c) => sum + (c.count || 0), 0);
  const avgAttendance = attendanceTrend.length
    ? Math.round(attendanceTrend.reduce((s, d) => s + d.rate, 0) / attendanceTrend.length)
    : null;

  const overviewCards = [
    { label: 'Active Classes', sub: 'This Year', value: classCounts.length, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Total Students', sub: 'Across Classes', value: totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Avg. Attendance', sub: 'Last 7 Days', value: avgAttendance !== null ? `${avgAttendance}%` : '—', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Tasks', sub: 'To Review', value: stats.activeAssignments, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  const quickActions = [
    { label: 'Mark Attendance', icon: UserPlus, page: 'attendance', color: 'bg-violet-50 text-violet-700 border-violet-100' },
    { label: 'Create Assignment', icon: ClipboardCheck, page: 'assignments', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'View Results', icon: BarChart3, page: 'view-results', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Send Message', icon: Send, page: 'messages', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Leave Request', icon: Calendar, page: 'leave-request', color: 'bg-rose-50 text-rose-700 border-rose-100' },
    { label: 'My Classes', icon: GraduationCap, page: 'student-details', color: 'bg-sky-50 text-sky-700 border-sky-100' }
  ];

  const getDeadlineStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (diffDays === 0) return { text: 'Due Today', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (diffDays === 1) return { text: 'Due Tomorrow', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { text: `${diffDays} days left`, color: 'text-violet-600', bgColor: 'bg-violet-50' };
  };

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-violet-100 rounded-lg flex-shrink-0">
            <Home className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name || 'Teacher'}! 👋
            </h1>
            <p className="text-gray-500 mt-1">Here's your class overview and tasks.</p>
          </div>
        </div>
        <div className="flex items-center bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2.5">
          <Clock className="h-4 w-4 mr-2 text-violet-600" />
          <span className="text-sm font-medium text-gray-700">{todayLabel}</span>
        </div>
      </div>

      {/* Hero row: schedule/class snapshot + overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class snapshot */}
        <div className="lg:col-span-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute right-16 bottom-0 w-24 h-24 rounded-full bg-white/5" />
          <div className="flex items-center justify-between mb-5 relative">
            <div>
              <h2 className="text-lg font-semibold">Classes</h2>
              <p className="text-sm text-white/70">{currentAcademicYear || 'Current academic year'}</p>
            </div>
            <button
              onClick={() => onNavigate('student-details')}
              className="text-sm bg-white/15 hover:bg-white/25 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View All Classes
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 relative">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white/10 rounded-xl animate-pulse" />)}
            </div>
          ) : classCounts.length === 0 ? (
            <div className="text-center py-8 relative">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 text-white/60" />
              <p className="text-sm text-white/80">No classes assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2.5 relative">
              {classCounts.slice(0, 3).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/10 hover:bg-white/15 transition-colors rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-semibold text-sm">
                      {c.className}{c.section}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Class {c.className} - Section {c.section.toUpperCase()}</p>
                      <p className="text-xs text-white/70">{c.count} students</p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-400/20 text-emerald-100 px-2 py-1 rounded-full font-medium">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Class Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Class Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            {overviewCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="text-center">
                  <div className={`w-11 h-11 mx-auto rounded-full ${card.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{loading ? '—' : card.value}</p>
                  <p className="text-xs font-medium text-gray-600">{card.label}</p>
                  <p className="text-[11px] text-gray-400">{card.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle row: attendance chart, tasks, announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900">Attendance Overview</h2>
            <span className="text-xs text-gray-400 font-medium">Last 7 Days</span>
          </div>
          <div className="h-56 -ml-4">
            {attendanceTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                No attendance data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Attendance']} />
                  <Area type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2.5} fill="url(#attendanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">Upcoming Tasks</h2>
            <button onClick={() => onNavigate('assignments')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              View All
            </button>
          </div>
          {loading ? (
            <div className="px-6 pb-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-6 pt-0 text-center">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No tasks yet</p>
              <button onClick={() => onNavigate('assignments')} className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium">
                Create your first assignment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {assignments.map((assignment: any, index: number) => {
                const deadline = getDeadlineStatus(assignment.dueDate);
                return (
                  <div key={index} className="px-6 py-3 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setSelectedAssignmentId(assignment._id)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{assignment.title}</p>
                        <p className="text-xs text-gray-500">
                          {assignment.subject} · Class {assignment.class}-{assignment.section}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${deadline.bgColor} ${deadline.color}`}>
                        {deadline.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Messages</h2>
            <button onClick={() => onNavigate('messages')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              View All
            </button>
          </div>
          {messages.length === 0 ? (
            <div className="p-6 pt-0 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No messages yet</p>
              <button onClick={() => onNavigate('messages')} className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium">
                Send a message
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.slice(0, 3).map((m: any, idx: number) => (
                <div key={idx} className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onNavigate('messages')}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">{m.senderName?.charAt(0).toUpperCase() || 'U'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.subject || 'Message'}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{m.message}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: my classes, quick actions, leave status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Classes table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">My Classes</h2>
            <button onClick={() => onNavigate('student-details')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              View All
            </button>
          </div>
          {classCounts.length === 0 ? (
            <div className="p-6 pt-0 text-center text-sm text-gray-400">No classes to show</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-2 font-medium">Class</th>
                    <th className="px-6 py-2 font-medium">Section</th>
                    <th className="px-6 py-2 font-medium">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classCounts.slice(0, 5).map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => onNavigate('student-details')}>
                      <td className="px-6 py-3 font-medium text-gray-900">Class {c.className}</td>
                      <td className="px-6 py-3 text-gray-600">{c.section.toUpperCase()}</td>
                      <td className="px-6 py-3 text-gray-600">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onNavigate(action.page)}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border ${action.color} hover:opacity-80 transition-opacity`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leave Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-6 pb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Leave Status</h2>
            <button onClick={() => onNavigate('leave-request')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              View All
            </button>
          </div>

          {stats.leaveRequests.pending > 0 && (
            <div className="mx-6 mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {stats.leaveRequests.pending} Pending Request{stats.leaveRequests.pending > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700">Awaiting admin approval</p>
              </div>
            </div>
          )}

          {leaveRequests.length === 0 ? (
            <div className="p-6 pt-0 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No leave requests</p>
              <button onClick={() => onNavigate('leave-request')} className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium">
                Apply for leave
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaveRequests.slice(0, 3).map((leave: any, index: number) => (
                <div key={index} className="px-6 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{leave.subjectLine}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment View Modal */}
      {selectedAssignmentId && (
        <ViewAssignmentModal
          isOpen={!!selectedAssignmentId}
          onClose={() => setSelectedAssignmentId(null)}
          assignmentId={selectedAssignmentId}
        />
      )}
    </div>
  );
};

export default Dashboard;