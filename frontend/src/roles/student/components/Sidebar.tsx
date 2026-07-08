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
  Calendar,
  GraduationCap,
  Contact,
  X,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import api from "../../../services/api";

interface StudentProfile {
  grade?: string;
  section?: string;
  class?: string;
  currentClass?: string;
  currentSection?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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
    title: "Calendar",
    icon: Calendar,
    path: "/student/calendar",
  },
  {
    title: "Profile",
    icon: User,
    path: "/student/profile",
  },
  {
    title: "Contact Info",
    icon: Contact,
    path: "/student/contact-info",
  },
];

export default function Sidebar({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>({});

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      const [messageRes, profileRes] = await Promise.all([
        api.get("/messages/student"),
        api.get("/users/my-profile").catch(() => null),
      ]);

      if (profileRes) {
        setProfile(profileRes.data?.data ?? {});
      }

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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile overlay (click to close) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r shadow-sm flex flex-col z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        {/* Header */}
        <div className="border-b p-5 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
                <GraduationCap size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight truncate">
                Student Portal
              </h2>
            </div>

            {/* Close button (mobile only) */}
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation (scrolls independently so the footer below always stays visible) */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.title}
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
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

                  {item.title === "Messages" && unreadMessages > 0 && (
                    <span className="flex items-center justify-center bg-blue-600 text-white text-xs rounded-full w-6 h-6 font-semibold">
                      {unreadMessages}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* Logout + Profile */}
        <div className="border-t p-4 space-y-2 flex-shrink-0">
          
        <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0">
          <p className="text-center text-xs text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-indigo-600">
              GoodSync ERP
            </span>
          </p>
        </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-red-600 hover:bg-red-50 transition-all hover:scale-[1.02]"
          >
            <LogOut size={18} />
            Logout
          </button>

          <div className="flex items-center min-w-0 rounded-xl bg-gray-50 px-2.5 py-2">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-semibold flex items-center justify-center mr-3 flex-shrink-0">
              {(user?.name ?? "S")
                .split(" ")
                .map((name) => name[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name ?? "Student"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile.grade || profile.class || profile.currentClass
                  ? `Grade ${profile.grade || profile.class || profile.currentClass}${
                      profile.section || profile.currentSection
                        ? ` • Section ${profile.section || profile.currentSection}`
                        : ""
                    }`
                  : (user?.userId || user?.email || "Student")}
              </p>

            </div>
          </div>
        </div>
      </aside>
    </>
  );
}