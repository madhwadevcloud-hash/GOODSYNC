import {
  ClipboardList,
  BookOpen,
  BarChart3,
  IndianRupee,
} from "lucide-react";

export default function Dashboard() {
  const cards = [
    {
      title: "Attendance",
      icon: ClipboardList,
    },
    {
      title: "Assignments",
      icon: BookOpen,
    },
    {
      title: "Results",
      icon: BarChart3,
    },
    {
      title: "Fees",
      icon: IndianRupee,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Student Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow p-6"
            >
              <Icon className="mb-4 text-blue-600" />

              <h2 className="font-semibold">{card.title}</h2>

              <p className="text-gray-500 mt-2">
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow mt-8 p-6">
        <h2 className="font-semibold mb-2">
          Recent Announcements
        </h2>

        <p className="text-gray-500">
          No announcements available.
        </p>
      </div>
    </div>
  );
}