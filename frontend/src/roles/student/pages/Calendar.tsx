import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  isToday,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import { useAcademicYear } from "../../../contexts/AcademicYearContext";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

type EventType = "holiday" | "exam" | "meeting" | "other";

interface CalendarEvent {
  _id?: string;
  title: string;
  date: string | Date;
  type: EventType;
  time?: string;
  location?: string;
  description?: string;
  isStandardHoliday?: boolean;
}

// Same fallback list the admin portal shows when the school hasn't added
// its own holidays yet, so students see the same default calendar.
const getStandardHolidays = (yearStr: string): CalendarEvent[] => {
  const startYear = parseInt(yearStr.substring(0, 4), 10);
  if (isNaN(startYear)) return [];

  return [
    { _id: "std-1", title: "New Year Day", date: new Date(`${startYear}-01-01T00:00:00.000Z`), type: "holiday", isStandardHoliday: true },
    { _id: "std-2", title: "Republic Day", date: new Date(`${startYear}-01-26T00:00:00.000Z`), type: "holiday", isStandardHoliday: true },
    { _id: "std-3", title: "Labor Day", date: new Date(`${startYear}-05-01T00:00:00.000Z`), type: "holiday", isStandardHoliday: true },
    { _id: "std-4", title: "Independence Day", date: new Date(`${startYear}-08-15T00:00:00.000Z`), type: "holiday", isStandardHoliday: true },
    { _id: "std-5", title: "Gandhi Jayanti", date: new Date(`${startYear}-10-02T00:00:00.000Z`), type: "holiday", isStandardHoliday: true },
    { _id: "std-6", title: "Christmas Day", date: new Date(`${startYear}-12-25T00:00:00.000Z`), type: "holiday", isStandardHoliday: true },
    { _id: "std-7", title: "Maha Shivaratri", date: new Date(`${startYear}-02-15T00:00:00.000Z`), type: "holiday", isStandardHoliday: true, description: "Subject to lunar calendar" },
    { _id: "std-8", title: "Holi", date: new Date(`${startYear}-03-15T00:00:00.000Z`), type: "holiday", isStandardHoliday: true, description: "Subject to lunar calendar" },
    { _id: "std-9", title: "Eid al-Fitr", date: new Date(`${startYear}-04-10T00:00:00.000Z`), type: "holiday", isStandardHoliday: true, description: "Subject to lunar calendar" },
    { _id: "std-10", title: "Dussehra", date: new Date(`${startYear}-10-15T00:00:00.000Z`), type: "holiday", isStandardHoliday: true, description: "Subject to lunar calendar" },
    { _id: "std-11", title: "Diwali", date: new Date(`${startYear}-11-05T00:00:00.000Z`), type: "holiday", isStandardHoliday: true, description: "Subject to lunar calendar" },
  ];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { viewingAcademicYear } = useAcademicYear();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch events from the same endpoint the admin portal uses
  const fetchEvents = async () => {
    if (!viewingAcademicYear) return;
    try {
      setLoading(true);
      const res = await api.get(
        `/calendar-events?academicYear=${viewingAcademicYear}`
      );
      if (res.data?.success) {
        const parsedEvents = res.data.data.map((e: any) => ({
          ...e,
          date: new Date(e.date),
        }));
        setEvents(parsedEvents);
      }
    } catch (err: any) {
      console.error("Failed to fetch calendar events:", err);
      toast.error(
        err.response?.data?.message || "Failed to load the school calendar"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingAcademicYear]);

  const allEvents = useMemo(() => {
    if (!viewingAcademicYear) return events;
    const standardHolidays = getStandardHolidays(viewingAcademicYear);
    return [...events, ...standardHolidays];
  }, [events, viewingAcademicYear]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allEvents
      .filter((event) => new Date(event.date) >= today)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      .slice(0, 6);
  }, [allEvents]);

  const getEventsForDay = (day: Date) => {
    return allEvents.filter((event) => isSameDay(new Date(event.date), day));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
    setIsPanelOpen(true);
  };

  const getTypeColor = (type: EventType) => {
    switch (type) {
      case "holiday":
        return "bg-red-100 text-red-700 border-red-200";
      case "exam":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "meeting":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "other":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getBadgeColor = (type: EventType) => {
    switch (type) {
      case "holiday":
        return "bg-red-500";
      case "exam":
        return "bg-purple-500";
      case "meeting":
        return "bg-blue-500";
      case "other":
        return "bg-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  const getBadgePill = (type: EventType) => {
    switch (type) {
      case "holiday":
        return "bg-blue-100 text-blue-600";
      case "exam":
        return "bg-purple-100 text-purple-600";
      case "meeting":
        return "bg-emerald-100 text-emerald-600";
      case "other":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Build the calendar grid (same month-grid logic as the admin portal)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let days: JSX.Element[] = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const dayEvents = getEventsForDay(cloneDay);
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isTodayDate = isToday(day);

      days.push(
        <div
          key={day.toString()}
          onClick={() => onDateClick(cloneDay)}
          className={`relative min-h-[90px] sm:min-h-[110px] p-1 sm:p-2 border-r border-b border-slate-100 transition-all duration-200 cursor-pointer group flex flex-col ${
            !isCurrentMonth
              ? "bg-slate-50/50 text-slate-400"
              : "bg-white text-slate-700"
          } ${
            isSelected
              ? "ring-2 ring-blue-500 ring-inset bg-blue-50/10 z-10"
              : "hover:bg-slate-50"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span
              className={`
                text-xs sm:text-sm font-semibold h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full
                ${isTodayDate ? "bg-blue-600 text-white shadow-sm" : ""}
                ${!isTodayDate && isSelected ? "bg-blue-100 text-blue-700" : ""}
              `}
            >
              {format(day, "d")}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                {dayEvents.length}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar mt-1">
            {dayEvents.map((event, idx) => (
              <div
                key={event._id || `${event.title}-${idx}`}
                className={`text-[12px] sm:text-[14px] leading-tight px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md border truncate font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm ${getTypeColor(
                  event.type
                )}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full hidden sm:block shrink-0 ${getBadgeColor(
                    event.type
                  )}`}
                ></span>
                <span className="truncate">{event.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="space-y-6 relative flex flex-col h-full min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-50 rounded-full blur-2xl opacity-60 -ml-10 -mb-10 pointer-events-none"></div>

        <div className="flex items-center space-x-4 relative z-10">
          <div className="bg-indigo-600 p-3 rounded-xl flex items-center justify-center shadow-sm">
            <CalendarDays className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              School Calendar
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              View school holidays and important dates for the academic
              year.
            </p>
          </div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 min-w-[160px] text-center sm:text-left">
          {format(currentDate, "MMMM yyyy")}
        </h2>

        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-md hover:bg-white hover:shadow-sm text-sm font-semibold text-slate-700 transition-all"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-all"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-100">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-80">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                <p className="text-sm font-medium">Loading Calendar...</p>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100">{rows}</div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="w-full xl:w-96 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-[18px]">🎉</span>
            <h3 className="text-[16px] font-bold text-slate-800 tracking-wide">
              Upcoming Events
            </h3>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-60">
              <p className="text-slate-500 text-sm font-medium">No upcoming events.</p>
            </div>
          ) : (
            <div className="flex-1 max-h-[600px] overflow-y-auto no-scrollbar flex flex-col divide-y divide-slate-100">
              {upcomingEvents.map((event, idx) => (
                <div
                  key={`${event._id}-${idx}`}
                  onClick={() => onDateClick(new Date(event.date))}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <h5 className="font-bold text-[14px] text-slate-700 truncate">
                      {event.title}
                    </h5>
                    <p className="text-[12px] text-slate-500 mt-1 truncate">
                      {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold capitalize ${getBadgePill(
                      event.type
                    )}`}
                  >
                    {event.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Day detail panel */}
      <AnimatePresence>
        {isPanelOpen && selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
            >
              {/* Panel Header */}
              <div className="px-6 py-5 border-b flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {format(selectedDate, "EEEE")}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Events ({selectedDayEvents.length})
                </h4>

                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <CalendarDays className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">
                      No events scheduled
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Enjoy your free day!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDayEvents.map((event, idx) => (
                      <div
                        key={event._id || idx}
                        className={`p-4 rounded-xl border ${getTypeColor(
                          event.type
                        )}`}
                      >
                        <div className="flex items-start justify-between">
                          <h5 className="font-bold text-sm mb-2 pr-2">
                            {event.title}
                          </h5>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/60 shrink-0">
                            {event.type}
                          </span>
                        </div>

                        {event.description && (
                          <p className="text-xs mb-3 opacity-90">
                            {event.description}
                          </p>
                        )}

                        <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-current/10">
                          {event.time && (
                            <div className="flex items-center gap-2 text-xs font-semibold opacity-80">
                              <Clock className="h-3.5 w-3.5" />
                              {event.time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2 text-xs font-semibold opacity-80">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}