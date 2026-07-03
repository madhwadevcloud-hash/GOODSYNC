import { NavLink } from "react-router-dom";
import {
  Home,
  User,
  BookOpen,
  ClipboardList,
  IndianRupee,
  BarChart3,
  MessageSquare,
  Activity,
  LogOut,
} from "lucide-react";

const menu = [
  { title: "Dashboard", icon: Home, path: "/student", end: true },
  { title: "Attendance", icon: ClipboardList, path: "/student/attendance" },
  { title: "Assignments", icon: BookOpen, path: "/student/assignments" },
  { title: "Results", icon: BarChart3, path: "/student/results" },
  { title: "Fees", icon: IndianRupee, path: "/student/fees" },
  { title: "Messages", icon: MessageSquare, path: "/student/messages" },
  { title: "Activity", icon: Activity, path: "/student/activity" },
  { title: "Profile", icon: User, path: "/student/profile" },
];

export default function Sidebar() {
  const handleLogout = () => {
    console.log("Logging out...");
  };

  return (
    <aside className="w-64 bg-white border-r h-screen flex flex-col justify-between">
      <div>
        <div className="p-6 text-xl font-bold border-b text-gray-800">
          Student Portal
        </div>

        <nav className="p-4 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.title}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}