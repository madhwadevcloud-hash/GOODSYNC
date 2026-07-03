
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Clock, FileText } from "lucide-react";
import api from "../../../services/api";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string;
  assignedDate: string;
  status: "Pending" | "Submitted" | "Late" | "Graded";
  marks?: number;
  totalMarks?: number;
}

export default function Assignments() {
  const [assignmentsData, setAssignmentsData] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/student/assignments");

        setAssignmentsData(response.data);
      } catch (err) {
        setError("Unable to load assignments");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const getStatusColor = (status: Assignment["status"]) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-700";

      case "Submitted":
        return "bg-blue-100 text-blue-700";

      case "Graded":
        return "bg-green-100 text-green-700";

      case "Late":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        Loading assignments...
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

      <div>
        <h1 className="text-4xl font-bold text-gray-900">
          Assignments
        </h1>

        <p className="text-gray-500 mt-2">
          View your assignments and submission status.
        </p>
      </div>

      {assignmentsData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12">
          <div className="flex flex-col items-center justify-center text-gray-500">
            <BookOpen size={48} className="mb-4 text-gray-300" />

            <h3 className="text-lg font-medium">
              No assignments available
            </h3>

            <p className="mt-2 text-sm">
              Your assignments will appear here once they are assigned.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {assignmentsData.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-xl shadow-sm border p-6"
            >
              <div className="flex justify-between items-start">

                <div className="space-y-3">

                  <div className="flex items-center gap-3">
                    <BookOpen className="text-blue-600" />

                    <h2 className="text-xl font-semibold">
                      {assignment.title}
                    </h2>
                  </div>

                  <p className="text-gray-600">
                    <strong>Subject :</strong> {assignment.subject}
                  </p>

                  <p className="text-gray-600">
                    {assignment.description}
                  </p>

                  <div className="flex gap-8 flex-wrap">

                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarDays size={18} />
                      Assigned :
                      {assignment.assignedDate}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={18} />
                      Due :
                      {assignment.dueDate}
                    </div>

                    {assignment.marks !== undefined &&
                      assignment.totalMarks !== undefined && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FileText size={18} />
                          Marks :
                          {assignment.marks}/{assignment.totalMarks}
                        </div>
                      )}

                  </div>

                </div>

                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                    assignment.status
                  )}`}
                >
                  {assignment.status}
                </span>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
