import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import api from "../../../services/api";

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      const addr = school.address || {};

      const addressLine = [
        addr.street,
        addr.area,
        addr.city,
        addr.district,
        addr.state,
        addr.zipCode || addr.pinCode,
      ]
        .filter(Boolean)
        .join(", ");

      setSchoolAddress(addressLine);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sidebar (fixed on desktop, slide-in drawer on mobile/tablet) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="lg:ml-64">

        {/* School Header */}
        <div className="bg-white border-b shadow-sm">

          <div className="min-h-16 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">

            {/* Left Side */}
            <div className="flex items-center gap-3 min-w-0">

              {/* Hamburger (mobile/tablet only) */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 flex-shrink-0"
              >
                <Menu size={22} />
              </button>

              {schoolLogo && (
                <img
                  src={schoolLogo}
                  alt="School Logo"
                  className="w-10 h-10 object-contain flex-shrink-0"
                />
              )}

              <div className="min-w-0">

                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  {schoolName}
                </h1>

                {schoolAddress && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {schoolAddress}
                  </p>
                )}

              </div>

            </div>

            {/* Right Side (kept empty for future use) */}
            <div />

          </div>

        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-128px)] overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}