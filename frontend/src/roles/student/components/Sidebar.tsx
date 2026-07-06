import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home,
  User,
  BookOpen,
  ClipboardList,
  IndianRupee,
  BarChart3,
  MessageSquare,
  LogOut,
} from "lucide-react";

import api from "../../../services/api";
import { useAuth } from "../../../auth/AuthContext";

const menu = [
  { title: "Dashboard", icon: Home, path: "/student", end: true },
  {
    title: "Attendance",
    icon: ClipboardList,
    path: "/student/attendance",
  },
  {
    title: "Assignments",
    icon: BookOpen,
    path: "/student/assignments",
  },
  {
    title: "Results",
    icon: BarChart3,
    path: "/student/results",
  },
  {
    title: "Fees",
    icon: IndianRupee,
    path: "/student/fees",
  },
  {
    title: "Messages",
    icon: MessageSquare,
    path: "/student/messages",
  },
  {
    title: "Profile",
    icon: User,
    path: "/student/profile",
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [schoolName, setSchoolName] = useState("School");
  const [schoolId, setSchoolId] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      const [schoolRes, messageRes] = await Promise.all([
        api.get("/schools/profile"),
        api.get("/messages/student"),
      ]);

      //-----------------------------
      // School Details
      //-----------------------------

      const school =
        schoolRes.data?.data ??
        schoolRes.data;

      setSchoolName(
        school.name ||
          school.schoolName ||
          "School"
      );

      setSchoolId(
        school.code ||
          school.schoolCode ||
          ""
      );

      setSchoolLogo(
        school.logoUrl ||
          school.logo ||
          ""
      );

      //-----------------------------
      // Unread Messages
      //-----------------------------

      const messages =
        messageRes.data?.data ||
        messageRes.data ||
        [];

      const unread = messages.filter(
        (msg: any) =>
          msg.isRead === false ||
          msg.read === false ||
          msg.status === "unread"
      );

      setUnreadMessages(unread.length);
    } catch (err) {
      console.error("Sidebar Error:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r shadow-sm flex flex-col justify-between z-40">

      {/* Top */}

      <div>

        <div className="border-b p-5">

          <div className="flex items-center gap-3">

            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="School Logo"
                className="w-12 h-12 rounded-full object-cover border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                {schoolName.charAt(0)}
              </div>
            )}

            <div>

              <h2 className="font-bold text-gray-900">
                {schoolId || "School ID"}
              </h2>

              <p className="text-xs text-gray-500">
                {schoolName}
              </p>

            </div>

          </div>

        </div>

        {/* Navigation */}

        <nav className="p-4 space-y-2">

          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.title}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-700 hover:bg-blue-50 hover:scale-[1.02]"
                  }`
                }
              >
                <div className="flex items-center gap-3">

                  <Icon size={18} />

                  <span>{item.title}</span>

                </div>

                {item.title === "Messages" &&
                  unreadMessages > 0 && (
                    <span className="flex items-center justify-center bg-blue-600 text-white text-xs rounded-full w-6 h-6 font-semibold">
                      {unreadMessages}
                    </span>
                  )}
              </NavLink>
            );
          })}

        </nav>

      </div>

      {/* Logout */}

      <div className="border-t p-4">

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-red-600 hover:bg-red-50 transition-all hover:scale-[1.02]"
        >
          <LogOut size={18} />
          Logout
        </button>

      </div>

    </aside>
  );
}