import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import {
  ClipboardList,
  BookOpen,
  BarChart3,
  IndianRupee,
  Bell,
} from "lucide-react";

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
  // Temporary frontend state.
  // Backend team will replace these values using API responses.
  const { user } = useAuth();
  
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    attendancePercentage: null as number | null,
    pendingAssignments: null as number | null,
    latestGrade: null as string | null,
    pendingFees: null as number | null,
    announcements: [] as {
      id: number;
      title: string;
      description: string;
      date: string;
    }[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {

    /*
    ==========================================================
    DEMO DATA (FRONTEND ONLY)

    This data is ONLY for frontend development.

    Backend team should REMOVE this block and
    replace it with the API call shown below.

    ==========================================================
    */

    setDashboardData({

      attendancePercentage: 94,

      pendingAssignments: 3,

      latestGrade: "A+",

      pendingFees: 2500,

      announcements: [

        {
          id: 1,
          title: "Unit Test Schedule Released",
          description:
            "Unit Test-I will begin from 22 July 2026. Please check the timetable.",
          date: "15 Jul 2026",
        },

        {
          id: 2,
          title: "Science Exhibition",
          description:
            "Students are requested to register for the Annual Science Exhibition.",
          date: "13 Jul 2026",
        },

        {
          id: 3,
          title: "Parent-Teacher Meeting",
          description:
            "PTM will be conducted on Saturday from 10:00 AM to 1:00 PM.",
          date: "10 Jul 2026",
        },

      ],

    });

    /*
    ==========================================================

    BACKEND API INTEGRATION

    Replace the above demo data with the API call below.

    const fetchDashboard = async () => {

        try {

            setLoading(true);

            const response = await api.get("/student/dashboard");

            setDashboardData(response.data);

        }

        catch (err) {

            setError("Unable to load dashboard");

        }

        finally {

            setLoading(false);

        }

    };

    fetchDashboard();

    ==========================================================
    */

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