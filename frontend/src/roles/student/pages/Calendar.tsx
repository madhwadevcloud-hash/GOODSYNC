import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
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
        return "bg-red-50 text-red-700 border-red-200";
      case "exam":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "meeting":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "other":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getBadgeColor = (type: EventType) => {
    switch (type) {
      case "holiday":
        return "bg-red-400";
      case "exam":
        return "bg-purple-400";
      case "meeting":
        return "bg-blue-400";
      case "other":
        return "bg-emerald-400";
      default:
        return "bg-gray-400";
    }
  };

  const getBadgePill = (type: EventType) => {
    switch (type) {
      case "holiday":
        return "bg-red-100 text-red-700";
      case "exam":
        return "bg-purple-100 text-purple-700";
      case "meeting":
        return "bg-blue-100 text-blue-700";
      case "other":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-700";
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
          className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 border-r border-b flex flex-col cursor-pointer transition ${
            !isCurrentMonth
              ? "bg-gray-50/60 text-gray-400"
              : "bg-white text-gray-700 hover:bg-blue-50/40"
          } ${isSelected ? "ring-2 ring-blue-500 ring-inset bg-blue-50/40 z-10" : ""}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-xs sm:text-sm font-medium h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full ${
                isTodayDate
                  ? "bg-blue-600 text-white"
                  : isSelected
                  ? "bg-blue-100 text-blue-700"
                  : ""
              }`}
            >
              {format(day, "d")}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                {dayEvents.length}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event, idx) => (
              <div
                key={event._id || `${event.title}-${idx}`}
                className={`text-[9px] sm:text-[11px] leading-tight px-1 sm:px-1.5 py-0.5 rounded border truncate font-medium flex items-center gap-1 ${getTypeColor(
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
            {dayEvents.length > 2 && (
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium pl-1">
                +{dayEvents.length - 2} more
              </p>
            )}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2 rounded-2xl border border-gray-100 bg-white px-6 sm:px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              School Calendar
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              View school holidays and important dates for the academic
              year.
            </p>
          </div>

          <CalendarDays className="text-blue-600 flex-shrink-0" size={36} />
        </div>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 min-w-[160px] text-center sm:text-left">
          {format(currentDate, "MMMM yyyy")}
        </h2>

        <div className="flex items-center bg-gray-50 rounded-lg p-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm transition"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-md text-sm font-semibold text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-sm transition"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm transition"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-3 text-center text-xs font-semibold text-gray-500 uppercase"
              >
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-80 text-gray-500 text-sm">
              Loading calendar...
            </div>
          ) : (
            <div>{rows}</div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <PartyPopper className="text-blue-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">
              Upcoming Events
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No upcoming events scheduled yet.
            </div>
          ) : (
            <div className="divide-y">
              {upcomingEvents.map((event, idx) => (
                <div
                  key={`${event._id}-${idx}`}
                  onClick={() => onDateClick(new Date(event.date))}
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-medium text-gray-900 truncate">
                      {event.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize ${getBadgePill(
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
              className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l flex flex-col"
            >
              {/* Panel Header */}
              <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/60">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {format(selectedDate, "EEEE")}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6">
                  Events ({selectedDayEvents.length})
                </h4>

                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <CalendarDays className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      No events scheduled
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
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