import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import api from "../../../services/api";

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");

  useEffect(() => {
    fetchSchool();
  }, []);

  const fetchSchool = async () => {
    try {
      const res = await api.get("/schools/profile");

      const school = res.data.data;

      setSchoolName(
        school.name ||
        school.schoolName ||
        ""
      );

      setSchoolLogo(
        school.logoUrl ||
        school.logo ||
        ""
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64">

        {/* School Header */}
        <div className="bg-white border-b shadow-sm">

          <div className="h-16 px-8 flex items-center justify-between">

            {/* Left Side */}
            <div className="flex items-center gap-3">

              {schoolLogo && (
                <img
                  src={schoolLogo}
                  alt="School Logo"
                  className="w-10 h-10 object-contain"
                />
              )}

              <div>

                <h1 className="text-2xl font-bold text-gray-900">
                  {schoolName}
                </h1>

              </div>

            </div>

            {/* Right Side (kept empty for future use) */}
            <div />

          </div>

        </div>

        {/* Page Content */}
        <main className="p-6 bg-gray-50 min-h-[calc(100vh-128px)] overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}