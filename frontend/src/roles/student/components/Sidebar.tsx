<<<<<<< HEAD
=======
import { NavLink } from "react-router-dom";
>>>>>>> student-portal
import {
  Home,
  User,
  BookOpen,
  ClipboardList,
  IndianRupee,
  BarChart3,
<<<<<<< HEAD
=======
  MessageSquare,
>>>>>>> student-portal
  LogOut,
} from "lucide-react";

const menu = [
<<<<<<< HEAD
  { title: "Dashboard", icon: Home },
  { title: "Attendance", icon: ClipboardList },
  { title: "Assignments", icon: BookOpen },
  { title: "Results", icon: BarChart3 },
  { title: "Fees", icon: IndianRupee },
  { title: "Profile", icon: User },
=======
  { title: "Dashboard", icon: Home, path: "/student" },
  { title: "Attendance", icon: ClipboardList, path: "/student/attendance" },
  { title: "Assignments", icon: BookOpen, path: "/student/assignments" },
  { title: "Results", icon: BarChart3, path: "/student/results" },
  { title: "Fees", icon: IndianRupee, path: "/student/fees" },
  { title: "Messages", icon: MessageSquare, path: "/student/messages" },
  { title: "Profile", icon: User, path: "/student/profile" },
  
>>>>>>> student-portal
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r h-screen">
      <div className="p-6 text-xl font-bold border-b">
        Student Portal
      </div>

      <nav className="p-4 space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
<<<<<<< HEAD
            <button
              key={item.title}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
            >
              <Icon size={18} />
              <span>{item.title}</span>
            </button>
=======
            <NavLink
  key={item.title}
  to={item.path}
  className={({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
      isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
    }`
  }
>
              <Icon size={18} />
              <span>{item.title}</span>
            </NavLink>
>>>>>>> student-portal
          );
        })}
      </nav>

<<<<<<< HEAD
      <div className="absolute bottom-5 left-4">
        <button className="flex items-center gap-3 text-red-600">
          <LogOut size={18} />
          Logout
        </button>
      </div>
=======
>>>>>>> student-portal
    </aside>
  );
}