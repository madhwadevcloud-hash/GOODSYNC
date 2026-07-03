
import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import {
  ClipboardList,
  BookOpen,
  BarChart3,
  IndianRupee,
  Bell,
} from "lucide-react";
import api from "../../../services/api";

interface Announcement {
  id: number;
  title: string;
  description: string;
  date: string;
}

interface DashboardData {
  attendancePercentage: number | null;
  pendingAssignments: number | null;
  latestGrade: string | null;
  pendingFees: number | null;
  announcements: Announcement[];
}

interface Announcement {
  id: number;
  title: string;
  description: string;
  date: string;
}

interface DashboardData {
  attendancePercentage: number | null;
  pendingAssignments: number | null;
  latestGrade: string | null;
  pendingFees: number | null;
  announcements: Announcement[];
}

export default function Dashboard() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    attendancePercentage: null,
    pendingAssignments: null,
    latestGrade: null,
    pendingFees: null,
    announcements: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch everything in parallel. Each call is handled independently
        // (via allSettled) so one missing/empty section (e.g. no fee
        // record yet) doesn't block the rest of the dashboard.
        const [attendanceRes, feesRes, assignmentsRes, resultsRes, messagesRes] =
          await Promise.allSettled([
            api.get("/attendance/my-attendance"),
            api.get("/fees/my-fees"),
            api.get("/assignments", { params: { limit: 100 } }),
            api.get("/results/my-results"),
            api.get("/messages/student", { params: { limit: 5 } }),
          ]);

        // Attendance %
        let attendancePercentage: number | null = null;
        if (attendanceRes.status === "fulfilled") {
          attendancePercentage =
            attendanceRes.value.data?.data?.summary?.attendancePercentage ?? null;
        }

        // Pending fees
        let pendingFees: number | null = null;
        if (feesRes.status === "fulfilled") {
          pendingFees = feesRes.value.data?.data?.totalPending ?? null;
        }

        // Pending assignments: active assignments whose due date hasn't passed yet.
        // (There's no per-student submission tracking wired up yet, so this
        // counts "not yet due" rather than "not yet submitted".)
        let pendingAssignments: number | null = null;
        if (assignmentsRes.status === "fulfilled") {
          const list = assignmentsRes.value.data?.assignments ?? [];
          const now = new Date();
          pendingAssignments = list.filter((a: any) => {
            if (!a.dueDate) return true;
            return new Date(a.dueDate) >= now;
          }).length;
        }

        // Latest overall grade
        let latestGrade: string | null = null;
        if (resultsRes.status === "fulfilled") {
          latestGrade = resultsRes.value.data?.data?.summary?.overallGrade ?? null;
        }

        // Announcements (reuse the messages feed)
        let announcements: Announcement[] = [];
        if (messagesRes.status === "fulfilled") {
          const msgs = messagesRes.value.data?.data ?? [];
          announcements = msgs.map((m: any, index: number) => ({
            id: index,
            title: m.title,
            description: m.content || m.message,
            date: m.createdAt
              ? new Date(m.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "",
          }));
        }

        setDashboardData({
          attendancePercentage,
          pendingAssignments,
          latestGrade,
          pendingFees,
          announcements,
        });
      } catch (err) {
        setError("Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const cards = [
    {
      title: "Attendance",
      value:
        dashboardData.attendancePercentage !== null
          ? `${dashboardData.attendancePercentage}%`
          : "--%",
      subtitle: "Overall Attendance",
      icon: ClipboardList,
      color: "text-blue-600",
    },
    {
      title: "Assignments",
      value:
        dashboardData.pendingAssignments !== null
          ? dashboardData.pendingAssignments
          : "--",
      subtitle: "Pending Assignments",
      icon: BookOpen,
      color: "text-green-600",
    },
    {
      title: "Results",
      value: dashboardData.latestGrade ?? "--",
      subtitle: "Latest Grade",
      icon: BarChart3,
      color: "text-purple-600",
    },
    {
      title: "Fees",
      value:
        dashboardData.pendingFees !== null
          ? `₹${dashboardData.pendingFees}`
          : "--",
      subtitle: "Pending Fees",
      icon: IndianRupee,
      color: "text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 font-medium">
        {error}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Student Dashboard
        </h1>

        <p className="mt-2 text-lg text-gray-600">
          Welcome,{" "}

          <span className="font-semibold text-blue-600">
              {user?.name ?? "Student"}
          </span>
          ! Here is your academic overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">
                    {card.title}
                  </p>

                  <h2 className="text-3xl font-bold mt-2">
                    {card.value}
                  </h2>

                  <p className="text-gray-400 text-sm mt-1">
                    {card.subtitle}
                  </p>
                </div>

                <div
                  className={`rounded-full p-3 bg-gray-100 ${card.color}`}
                >
                  <Icon size={28} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          <Bell size={20} />
          <h2 className="text-lg font-semibold">
            Recent Announcements
          </h2>
        </div>

        <div className="p-6">
          {dashboardData.announcements.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No announcements available.
            </div>
          ) : (
            dashboardData.announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="border-b py-4 last:border-none"
              >
                <h3 className="font-medium">
                  {announcement.title}
                </h3>

                <p className="text-gray-600 mt-1">
                  {announcement.description}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  {announcement.date}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}