import { useEffect, useState } from "react";
import {
  GraduationCap,
  Trophy,
  BookOpen,
  Award,
} from "lucide-react";
import api from "../../../services/api";

interface ResultSummary {
  overallPercentage: number | null;
  overallGrade: string | null;
  totalSubjects: number | null;
  passedSubjects: number | null;
}

interface SubjectResult {
  id: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  status: "Pass" | "Fail";
}

export default function Results() {
  const [resultsData, setResultsData] = useState({
    summary: {
      overallPercentage: null,
      overallGrade: null,
      totalSubjects: null,
      passedSubjects: null,
    } as ResultSummary,

    subjects: [] as SubjectResult[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError("");

        // Backend returns { success, data: { summary, subjects } }
        const response = await api.get("/results/my-results");

        setResultsData(
          response.data?.data ?? {
            summary: {
              overallPercentage: null,
              overallGrade: null,
              totalSubjects: null,
              passedSubjects: null,
            },
            subjects: [],
          }
        );
      } catch (err) {
        setError("Unable to load results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        Loading Results...
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
              Results
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Check your examination results and subject-wise performance.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-gray-500 text-sm">
                Overall %
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {resultsData.summary.overallPercentage ?? "--"}%
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                Overall Percentage
              </p>

            </div>

            <GraduationCap
              className="text-blue-600"
              size={30}
            />

          </div>

        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-gray-500 text-sm">
                Overall Grade
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {resultsData.summary.overallGrade ?? "--"}
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                Final Grade
              </p>

            </div>

            <Award
              className="text-green-600"
              size={30}
            />

          </div>

        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-gray-500 text-sm">
                Subjects
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {resultsData.summary.totalSubjects ?? "--"}
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                Total Subjects
              </p>

            </div>

            <BookOpen
              className="text-purple-600"
              size={30}
            />

          </div>

        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-gray-500 text-sm">
                Passed
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {resultsData.summary.passedSubjects ?? "--"}
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                Passed Subjects
              </p>

            </div>

            <Trophy
              className="text-yellow-500"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* Subject Results */}

      <div className="bg-white rounded-xl shadow-sm border">

        <div className="px-6 py-4 border-b">

          <h2 className="text-xl font-semibold">
            Subject-wise Results
          </h2>

        </div>

        {resultsData.subjects.length === 0 ? (

          <div className="p-10 text-center text-gray-500">
            No result records available.
          </div>

        ) : (

          <table className="w-full">

            <thead>

              <tr className="bg-gray-50">

                <th className="text-left px-6 py-3">
                  Subject
                </th>

                <th className="text-left px-6 py-3">
                  Marks
                </th>

                <th className="text-left px-6 py-3">
                  Grade
                </th>

                <th className="text-left px-6 py-3">
                  Status
                </th>

              </tr>

            </thead>

            <tbody>

              {resultsData.subjects.map((subject) => (

                <tr
                  key={subject.id}
                  className="border-t"
                >

                  <td className="px-6 py-4">
                    {subject.subject}
                  </td>

                  <td className="px-6 py-4">
                    {subject.marksObtained}/{subject.totalMarks}
                  </td>

                  <td className="px-6 py-4">
                    {subject.grade}
                  </td>

                  <td className="px-6 py-4">

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        subject.status === "Pass"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {subject.status}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>
  );
}