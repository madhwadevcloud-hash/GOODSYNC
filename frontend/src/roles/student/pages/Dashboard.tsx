import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import {
  ClipboardCheck,
  BookOpen,
  BarChart3,
  IndianRupee,
  Bell,
  Calendar,
  MessageSquare,
  GraduationCap,
  FlaskConical,
  Calculator,
  Globe2,
  Laptop2,
  BookMarked,
  ClipboardList,
  ClipboardCheck as ClipboardCheckIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import api from "../../../services/api";

interface Announcement {
  id: number;
  title: string;
  description: string;
  date: string;
}

interface SubjectProgress {
  subject: string;
  grade: string;
  percentage: number;
}

interface UpcomingAssignment {
  id: string;
  title: string;
  dueDate: string | null;
}

interface Installment {
  name: string;
  amount: number;
  paidAmount?: number;
  dueDate: string | null;
  status: "PENDING" | "PAID" | "OVERDUE" | string;
}

interface DashboardData {
  attendancePercentage: number | null;
  totalWorkingDays: number | null;
  presentDays: number | null;
  absentDays: number | null;
  lateDays: number | null;

  totalAssignments: number | null;
  pendingAssignments: number | null;
  upcomingAssignments: UpcomingAssignment[];

  latestGrade: string | null;
  overallResultPercentage: number | null;
  passedSubjects: number | null;
  totalSubjects: number | null;
  subjects: SubjectProgress[];

  pendingFees: number | null;
  totalFeeAmount: number | null;
  totalFeePaid: number | null;
  feeStatus: string | null;
  installments: Installment[];

  unreadMessages: number;
  announcements: Announcement[];

  academicYear: string | null;
  studentClass: string | null;
  studentSection: string | null;
}

const SUBJECT_STYLES: { match: RegExp; icon: any; barColor: string; iconBg: string; iconColor: string }[] = [
  { match: /math/i, icon: Calculator, barColor: "bg-blue-600", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { match: /science/i, icon: FlaskConical, barColor: "bg-green-600", iconBg: "bg-green-50", iconColor: "text-green-600" },
  { match: /english/i, icon: BookOpen, barColor: "bg-purple-600", iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { match: /social/i, icon: Globe2, barColor: "bg-orange-500", iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  { match: /computer/i, icon: Laptop2, barColor: "bg-cyan-500", iconBg: "bg-cyan-50", iconColor: "text-cyan-500" },
];

function getSubjectStyle(subject: string) {
  const found = SUBJECT_STYLES.find((s) => s.match.test(subject));
  return (
    found ?? {
      icon: BookMarked,
      barColor: "bg-indigo-500",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-500",
    }
  );
}

function daysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysAgo(dateStr: string): string {
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return "";
  const now = new Date();
  const diff = Math.max(0, Math.round((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function installmentBadge(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "PAID") return "bg-green-50 text-green-700";
  if (normalized === "OVERDUE") return "bg-red-50 text-red-700";
  return "bg-orange-50 text-orange-700";
}

const CHIP_COLORS = [
  "bg-green-50 text-green-700",
  "bg-orange-50 text-orange-700",
  "bg-red-50 text-red-700",
];

export default function Dashboard() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    attendancePercentage: null,
    totalWorkingDays: null,
    presentDays: null,
    absentDays: null,
    lateDays: null,

    totalAssignments: null,
    pendingAssignments: null,
    upcomingAssignments: [],

    latestGrade: null,
    overallResultPercentage: null,
    passedSubjects: null,
    totalSubjects: null,
    subjects: [],

    pendingFees: null,
    totalFeeAmount: null,
    totalFeePaid: null,
    feeStatus: null,
    installments: [],

    unreadMessages: 0,
    announcements: [],

    academicYear: null,
    studentClass: null,
    studentSection: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch everything in parallel, straight from the same APIs the
        // Attendance / Assignments / Results / Fees / Messages pages use.
        // Each call is handled independently (via allSettled) so one
        // missing/empty section (e.g. no fee record yet) doesn't block
        // the rest of the dashboard.
        const [attendanceRes, feesRes, assignmentsRes, resultsRes, messagesRes, profileRes] =
          await Promise.allSettled([
            api.get("/attendance/my-attendance"),
            api.get("/student/fees"),
            api.get("/assignments", { params: { limit: 100 } }),
            api.get("/results/my-results"),
            api.get("/messages/student", { params: { limit: 5 } }),
            api.get("/users/my-profile"),
          ]);

        // Attendance
        let attendancePercentage: number | null = null;
        let totalWorkingDays: number | null = null;
        let presentDays: number | null = null;
        let absentDays: number | null = null;
        let lateDays: number | null = null;
        if (attendanceRes.status === "fulfilled") {

          const attendance =
            attendanceRes.value.data?.data ??
            attendanceRes.value.data;

          const summary =
            attendance.summary ??
            attendance;

          attendancePercentage =
            summary.attendancePercentage ??
            summary.percentage ??
            0;

          presentDays =
            summary.presentDays ??
            summary.present ??
            0;

          absentDays =
            summary.absentDays ??
            summary.absent ??
            0;

          lateDays =
            summary.lateDays ??
            summary.late ??
            0;

          totalWorkingDays =
            summary.totalWorkingDays ??
            summary.workingDays ??
            (presentDays + absentDays + lateDays);
        }

        // Fees: pending amount, totals (for a real "% paid" progress bar) and
        // the installment list (for the Fee Installments card).
        let pendingFees: number | null = null;
        let totalFeeAmount: number | null = null;
        let totalFeePaid: number | null = null;
        let feeStatus: string | null = null;
        let installments: Installment[] = [];
        if (feesRes.status === "fulfilled") {

          const feeData = feesRes.value.data;

          const feeRecord = feeData?.feeRecord;

          if (feeRecord) {

              pendingFees = feeRecord.totalPending ?? 0;

              totalFeeAmount = feeRecord.totalAmount ?? 0;

              totalFeePaid = feeRecord.totalPaid ?? 0;

              feeStatus = feeRecord.status ?? "PENDING";

              installments = (feeRecord.installments ?? []).map((item: any) => ({

                  name: item.name,

                  amount: Number(item.amount) || 0,

                  paidAmount:
                      Number(item.paidAmount) ||
                      Number(item.amountPaid) ||
                      Number(item.paid) ||
                      0,

                  dueDate: item.dueDate,

                  status: item.status

              }));

          }
        }

        // Assignments: total assigned, still-pending (not yet due), and the
        // soonest-due ones for the "Upcoming Assignments" list.
        let totalAssignments: number | null = null;
        let pendingAssignments: number | null = null;
        let upcomingAssignments: UpcomingAssignment[] = [];
        if (assignmentsRes.status === "fulfilled") {
          const list = assignmentsRes.value.data?.assignments ?? [];
          const now = new Date();
          totalAssignments = list.length;
          const pending = list.filter((a: any) => !a.dueDate || new Date(a.dueDate) >= now);
          pendingAssignments = pending.length;
          upcomingAssignments = pending
            .slice()
            .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 3)
            .map((a: any) => ({ id: a._id ?? a.id, title: a.title, dueDate: a.dueDate ?? null }));
        }

        // Results / subject-wise progress
        let latestGrade: string | null = null;
        let overallResultPercentage: number | null = null;
        let passedSubjects: number | null = null;
        let totalSubjects: number | null = null;
        let subjects: SubjectProgress[] = [];
        if (resultsRes.status === "fulfilled") {
          const data = resultsRes.value.data?.data ?? {};
          latestGrade = data.summary?.overallGrade ?? null;
          overallResultPercentage = data.summary?.overallPercentage ?? null;
          passedSubjects = data.summary?.passedSubjects ?? null;
          totalSubjects = data.summary?.totalSubjects ?? null;
          subjects = (data.subjects ?? []).map((s: any) => ({
            subject: s.subject,
            grade: s.grade,
            percentage:
              s.totalMarks > 0 ? Math.round((s.marksObtained / s.totalMarks) * 100) : 0,
          }));
        }

        // Announcements (reuse the messages feed) + count for the bell badge
        let announcements: Announcement[] = [];
        let unreadMessages = 0;
        if (messagesRes.status === "fulfilled") {
          const msgs = messagesRes.value.data?.data ?? [];
          unreadMessages = msgs.filter(
            (m: any) => m.isRead === false
          ).length;
          announcements = msgs.map((m: any, index: number) => ({
            id: index,
            title: m.title,
            description: m.content || m.message,
            date: m.createdAt ?? "",
          }));
        }

        // Profile (class / section / academic year)
        let academicYear: string | null = null;
        let studentClass: string | null = null;
        let studentSection: string | null = null;
        if (profileRes.status === "fulfilled") {
          const p = profileRes.value.data?.data ?? profileRes.value.data ?? {};
          academicYear = p.academicYear ?? user?.academicYear ?? null;
          studentClass = p.class ?? p.currentClass ?? null;
          studentSection = p.section ?? p.currentSection ?? null;
        }

        setDashboardData({
          attendancePercentage,
          totalWorkingDays,
          presentDays,
          absentDays,
          lateDays,

          totalAssignments,
          pendingAssignments,
          upcomingAssignments,

          latestGrade,
          overallResultPercentage,
          passedSubjects,
          totalSubjects,
          subjects,

          pendingFees,
          totalFeeAmount,
          totalFeePaid,
          feeStatus,
          installments,

          unreadMessages,
          announcements,

          academicYear,
          studentClass,
          studentSection,
        });
      } catch (err) {
        setError("Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const attendanceDonut = useMemo(
    () => [
      { name: "Present", value: dashboardData.presentDays ?? 0, color: "#22c55e" },
      { name: "Absent", value: dashboardData.absentDays ?? 0, color: "#f59e0b" },
      { name: "Late", value: dashboardData.lateDays ?? 0, color: "#d1d5db" },
    ],
    [dashboardData]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 font-medium">{error}</div>;
  }

  const feePaidPercentage =
    dashboardData.totalFeeAmount && dashboardData.totalFeeAmount > 0
      ? Math.round(((dashboardData.totalFeePaid ?? 0) / dashboardData.totalFeeAmount) * 100)
      : dashboardData.pendingFees === 0
      ? 100
      : 0;

  const statCards = [
    {
      title: "Overall Attendance",
      value:
        dashboardData.attendancePercentage !== null
          ? `${dashboardData.attendancePercentage}%`
          : "--%",
      caption:
        dashboardData.attendancePercentage !== null
          ? dashboardData.attendancePercentage >= 75
            ? "Good"
            : "Needs improvement"
          : "--",
      progress: dashboardData.attendancePercentage ?? 0,
      icon: ClipboardCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      barColor: "bg-green-500",
      link: "/student/attendance",
    },
    {
      title: "Assignments",
      value: dashboardData.totalAssignments ?? "--",
      caption: "Total assigned",
      footer:
        dashboardData.pendingAssignments !== null
          ? `${dashboardData.pendingAssignments} Pending`
          : "--",
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
      barColor: "bg-blue-500",
      progress:
        dashboardData.totalAssignments && dashboardData.totalAssignments > 0
          ? 100 -
            Math.round(
              ((dashboardData.pendingAssignments ?? 0) / dashboardData.totalAssignments) * 100
            )
          : 0,
      link: "/student/assignments",
    },
    {
      title: "Latest Grade",
      value: dashboardData.latestGrade ?? "--",
      caption:
        dashboardData.overallResultPercentage !== null
          ? `${dashboardData.overallResultPercentage}% overall`
          : "Overall",
      footer:
        dashboardData.overallResultPercentage !== null
          ? dashboardData.overallResultPercentage >= 90
            ? "Excellent"
            : dashboardData.overallResultPercentage >= 75
            ? "Good"
            : "Needs improvement"
          : "--",
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50",
      barColor: "bg-purple-500",
      progress: dashboardData.overallResultPercentage ?? 0,
      link: "/student/results",
    },
    {
      title: "Pending Fees",
      value: formatCurrency(
        Number(dashboardData.pendingFees ?? 0)
      ),
      caption: dashboardData.pendingFees === 0 ? "All clear" : dashboardData.feeStatus ?? "--",
      footer: dashboardData.pendingFees === 0 ? "No due amount" : "Payment due",
      icon: IndianRupee,
      color: "text-orange-500",
      bg: "bg-orange-50",
      barColor: "bg-orange-500",
      progress: feePaidPercentage,
      link: "/student/fees",
    },
  ];

  const miniStats = [
    {
      title: "Assignments",
      value: dashboardData.pendingAssignments ?? "--",
      caption: "Pending",
      icon: ClipboardCheckIcon,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/student/assignments",
    },
    {
      title: "Results",
      value:
        dashboardData.totalSubjects !== null
          ? `${dashboardData.passedSubjects ?? 0}/${dashboardData.totalSubjects}`
          : "--",
      caption: "Subjects passed",
      icon: GraduationCap,
      color: "text-purple-600",
      bg: "bg-purple-50",
      link: "/student/results",
    },
    {
      title: "Messages",
      value: dashboardData.unreadMessages,
      caption: "Recent",
      icon: MessageSquare,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      link: "/student/messages",
    },
    {
      title: "Fee Status",
      value:
        dashboardData.feeStatus ??
        (dashboardData.pendingFees === 0 ? "Paid" : "Due"),
      caption: dashboardData.pendingFees === 0 ? "All clear" : "Pending",
      icon: IndianRupee,
      color: "text-orange-500",
      bg: "bg-orange-50",
      link: "/student/fees",
    },
  ];

  const quickLinks = [
    { title: "Attendance", icon: ClipboardCheck, to: "/student/attendance" },
    { title: "Assignments", icon: BookOpen, to: "/student/assignments" },
    { title: "Results", icon: BarChart3, to: "/student/results" },
    { title: "Fees", icon: IndianRupee, to: "/student/fees" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Top stat cards */}
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              to={card.link}
              key={card.title}
              className="col-span-12 sm:col-span-6 xl:col-span-2 bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-lg p-2.5 ${card.bg} ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-3">{card.title}</p>
              <h2 className="text-2xl font-bold mt-1 text-gray-900">{card.value}</h2>
              <p className="text-gray-400 text-xs mt-1">{card.caption}</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                />
              </div>
              {"footer" in card && card.footer && (
                <p className="text-gray-400 text-xs mt-2">{card.footer}</p>
              )}
            </Link>
          );
        })}

        {/* Current academic year */}
        <div className="col-span-12 xl:col-span-4 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl shadow-sm p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <Calendar className="absolute top-4 right-4 opacity-30" size={28} />
          <p className="text-white/80 text-sm">Current Academic Year</p>
          <h2 className="text-3xl font-bold mt-2">
            {dashboardData.academicYear ?? user?.academicYear ?? "--"}
          </h2>
          <p className="text-white/80 text-sm mt-2">
            {[
              dashboardData.studentClass && `Grade ${dashboardData.studentClass}`,
              dashboardData.studentSection && `Section ${dashboardData.studentSection}`,
            ]
              .filter(Boolean)
              .join(" - ") || "Student"}
          </p>
        </div>

        {/* Attendance overview */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Attendance Overview</h3>
            <Link to="/student/attendance" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceDonut}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={65}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    {attendanceDonut.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {dashboardData.attendancePercentage ?? "--"}%
                </span>
                <span className="text-xs text-gray-400">Present</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-gray-500">Present</span>
                <span className="ml-auto font-medium text-gray-900">
                  {dashboardData.presentDays ?? "--"} Days
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-gray-500">Absent</span>
                <span className="ml-auto font-medium text-gray-900">
                  {dashboardData.absentDays ?? "--"} Days
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="text-gray-500">Late</span>
                <span className="ml-auto font-medium text-gray-900">
                  {dashboardData.lateDays ?? "--"} Day
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-6 pt-4 border-t">
            <span>Total Working Days</span>
            <span className="font-medium text-gray-900">
              {dashboardData.totalWorkingDays ??
              (
                (dashboardData.presentDays ?? 0) +
                (dashboardData.absentDays ?? 0) +
                (dashboardData.lateDays ?? 0)
              )} Days
            </span>
          </div>
        </div>

        {/* Subject progress */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Subject Progress</h3>
            <Link to="/student/results" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {dashboardData.subjects.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">
              No subject results available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.subjects.map((s) => {
                const style = getSubjectStyle(s.subject);
                const Icon = style.icon;
                return (
                  <div key={s.subject} className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${style.iconBg} ${style.iconColor}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 mb-1">{s.subject}</p>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${style.barColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, s.percentage))}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{s.grade}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column mini stats */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4 content-start">
          {miniStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                to={stat.link}
                key={stat.title}
                className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
              >
                <div className={`rounded-lg p-2 inline-flex ${stat.bg} ${stat.color}`}>
                  <Icon size={16} />
                </div>
                <p className="text-gray-500 text-xs mt-2">{stat.title}</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{stat.caption}</p>
              </Link>
            );
          })}
        </div>

        {/* Upcoming assignments */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-900">Upcoming Assignments</h3>
            <Link to="/student/assignments" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="p-4">
            {dashboardData.upcomingAssignments.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">
                No upcoming assignments.
              </div>
            ) : (
              dashboardData.upcomingAssignments.map((a, i) => {
                const left = daysLeft(a.dueDate);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-2 py-3 border-b last:border-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-2 bg-gray-50 text-gray-500">
                        <ClipboardList size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-400">
                          Due:{" "}
                          {a.dueDate
                            ? new Date(a.dueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "--"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                        CHIP_COLORS[i % CHIP_COLORS.length]
                      }`}
                    >
                      {left !== null ? `${left} Days Left` : "--"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Fee installments — real data from /fees/my-fees, replaces the
            fabricated "exam timetable" placeholder from the reference design
            since there's no exam-scheduling API for students yet. */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-900">Fee Installments</h3>
            <Link to="/student/fees" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="p-4">
            {dashboardData.installments.length === 0 ? (

                <div className="text-center text-gray-400 py-10">
                    No fee installments found.
                </div>

            ) : (

                <div className="space-y-3">

                    {dashboardData.installments.slice(0,3).map((item,index)=>(

                        <div
                            key={index}
                            className="flex justify-between items-center border-b pb-3 last:border-none"
                        >

                            <div>

                                <p className="font-medium">

                                    {item.name}

                                </p>

                                <p className="text-sm text-gray-500">

                                    Due {new Date(item.dueDate).toLocaleDateString()}

                                </p>

                            </div>

                            <div className="text-right">

                                <p className="font-semibold">

                                    ₹{(item.amount-item.paidAmount).toLocaleString("en-IN")}

                                </p>

                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                        item.status==="PAID"
                                            ? "bg-green-100 text-green-700"
                                            : item.status==="OVERDUE"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                    }`}
                                >

                                    {item.status}

                                </span>

                            </div>

                        </div>

                    ))}

                </div>

            )}
          </div>
        </div>

        {/* Recent announcements */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <h3 className="font-semibold text-gray-900">Recent Announcements</h3>
            </div>
            <Link to="/student/messages" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="p-4">
            {dashboardData.announcements.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">
                No announcements available.
              </div>
            ) : (
              dashboardData.announcements.map((a) => (
                <div key={a.id} className="flex gap-3 px-2 py-3 border-b last:border-none">
                  <div className="rounded-lg p-2 bg-purple-50 text-purple-600 h-fit">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{daysAgo(a.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick links — real navigation to existing student routes */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  to={link.to}
                  key={link.title}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="rounded-lg p-2.5 bg-blue-50 text-blue-600">
                    <Icon size={18} />
                  </div>
                  <span className="text-xs text-gray-500 text-center">{link.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}