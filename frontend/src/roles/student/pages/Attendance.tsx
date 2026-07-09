import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import api from "../../../services/api";

interface AttendanceSummary {
  attendancePercentage: number | null;
  totalWorkingDays: number | null;
  presentDays: number | null;
  absentDays: number | null;
}

interface MonthlyAttendance {
  month: string;
  present: number;
  absent: number;
  percentage: number;
}

interface DailyAttendance {
  date: string;
  status: "Present" | "Absent" | "Leave" | "Holiday";
}

export default function Attendance() {
  const [attendanceData, setAttendanceData] = useState({
    summary: {
      attendancePercentage: null,
      totalWorkingDays: null,
      presentDays: null,
      absentDays: null,
    } as AttendanceSummary,

    monthly: [] as MonthlyAttendance[],

    recentAttendance: [] as DailyAttendance[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/student/attendance");

        setAttendanceData(response.data);
      } catch (err) {
        setError("Unable to load attendance.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  const getStatusColor = (status: DailyAttendance["status"]) => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-700";

      case "Absent":
        return "bg-red-100 text-red-700";

      case "Leave":
        return "bg-yellow-100 text-yellow-700";

      case "Holiday":
        return "bg-blue-100 text-blue-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          <p className="text-sm font-medium">Loading Attendance...</p>
        </div>
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

      {/* Header */}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Attendance
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Track your attendance and monitor your academic progress.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">
                Attendance %
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {attendanceData.summary.attendancePercentage !== null
                  ? `${attendanceData.summary.attendancePercentage}%`
                  : "--%"}
              </h2>
            </div>

            <CalendarDays className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">
                Present
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {attendanceData.summary.presentDays ?? "--"}
              </h2>
            </div>

            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">
                Absent
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {attendanceData.summary.absentDays ?? "--"}
              </h2>
            </div>

            <XCircle className="text-red-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">
                Working Days
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {attendanceData.summary.totalWorkingDays ?? "--"}
              </h2>
            </div>

            <Clock className="text-purple-600" size={32} />
          </div>
        </div>

      </div>

      {/* Monthly Attendance */}

      <div className="bg-white rounded-xl shadow-sm border">

        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            Monthly Attendance
          </h2>
        </div>

        {attendanceData.monthly.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No monthly attendance records available.
          </div>
        ) : (
          <table className="w-full">

            <thead>

              <tr className="bg-gray-50">

                <th className="text-left px-6 py-3">Month</th>

                <th className="text-left px-6 py-3">Present</th>

                <th className="text-left px-6 py-3">Absent</th>

                <th className="text-left px-6 py-3">Attendance %</th>

              </tr>

            </thead>

            <tbody>

              {attendanceData.monthly.map((month) => (

                <tr
                  key={month.month}
                  className="border-t"
                >

                  <td className="px-6 py-4">
                    {month.month}
                  </td>

                  <td className="px-6 py-4">
                    {month.present}
                  </td>

                  <td className="px-6 py-4">
                    {month.absent}
                  </td>

                  <td className="px-6 py-4">
                    {month.percentage}%
                  </td>

                </tr>

              ))}

            </tbody>

          </table>
        )}

      </div>

      {/* Recent Attendance */}

      <div className="bg-white rounded-xl shadow-sm border">

        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            Recent Attendance
          </h2>
        </div>

        {attendanceData.recentAttendance.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No recent attendance available.
          </div>
        ) : (
          <div className="divide-y">

            {attendanceData.recentAttendance.map((item) => (

              <div
                key={item.date}
                className="flex justify-between items-center px-6 py-4"
              >

                <span>{item.date}</span>

                <span
                  className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>

              </div>

            ))}

          </div>
        )}

      </div>

    </div>
  );
}