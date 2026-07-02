import {
  Home,
  User,
  BookOpen,
  ClipboardList,
  IndianRupee,
  BarChart3,
  LogOut,
} from "lucide-react";

const menu = [
  { title: "Dashboard", icon: Home },
  { title: "Attendance", icon: ClipboardList },
  { title: "Assignments", icon: BookOpen },
  { title: "Results", icon: BarChart3 },
  { title: "Fees", icon: IndianRupee },
  { title: "Profile", icon: User },
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
            <button
              key={item.title}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
            >
              <Icon size={18} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-4">
        <button className="flex items-center gap-3 text-red-600">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}