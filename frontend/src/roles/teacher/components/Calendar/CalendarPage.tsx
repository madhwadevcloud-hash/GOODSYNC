import React, { useState } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  MoreVertical,
  Clock,
  MapPin,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
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
  isToday
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import { useAuth } from '../../../../auth/AuthContext';
import api from '../../../../services/api';
import { toast } from 'react-hot-toast';

type EventType = 'holiday' | 'exam' | 'meeting' | 'other';

interface CalendarEvent {
  _id?: string;
  title: string;
  date: string | Date; // API returns string, we'll parse it
  type: EventType;
  time?: string;
  location?: string;
  description?: string;
  isStandardHoliday?: boolean; // Flag to identify auto-generated holidays
  createdBy?: string;          // userId/_id of whoever created the event
  createdByRole?: 'admin' | 'teacher';
}

// Helper to generate standard public holidays automatically for a given year
const getStandardHolidays = (yearStr: string): CalendarEvent[] => {
  const startYear = parseInt(yearStr.substring(0, 4), 10);
  if (isNaN(startYear)) return [];

  return [
    { _id: 'std-1', title: 'New Year Day', date: new Date(`${startYear}-01-01T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true },
    { _id: 'std-2', title: 'Republic Day', date: new Date(`${startYear}-01-26T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true },
    { _id: 'std-3', title: 'Labor Day', date: new Date(`${startYear}-05-01T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true },
    { _id: 'std-4', title: 'Independence Day', date: new Date(`${startYear}-08-15T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true },
    { _id: 'std-5', title: 'Gandhi Jayanti', date: new Date(`${startYear}-10-02T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true },
    { _id: 'std-6', title: 'Christmas Day', date: new Date(`${startYear}-12-25T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true },
    { _id: 'std-7', title: 'Maha Shivaratri', date: new Date(`${startYear}-02-15T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true, description: 'Subject to lunar calendar' },
    { _id: 'std-8', title: 'Holi', date: new Date(`${startYear}-03-15T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true, description: 'Subject to lunar calendar' },
    { _id: 'std-9', title: 'Eid al-Fitr', date: new Date(`${startYear}-04-10T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true, description: 'Subject to lunar calendar' },
    { _id: 'std-10', title: 'Dussehra', date: new Date(`${startYear}-10-15T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true, description: 'Subject to lunar calendar' },
    { _id: 'std-11', title: 'Diwali', date: new Date(`${startYear}-11-05T00:00:00.000Z`), type: 'holiday', isStandardHoliday: true, description: 'Subject to lunar calendar' }
  ];
};

const CalendarPage: React.FC = () => {
  const { viewingAcademicYear } = useAcademicYear();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'other' as EventType,
    time: '',
    location: '',
    description: ''
  });

  // Fetch events
  const fetchEvents = async () => {
    if (!viewingAcademicYear) return;
    try {
      setLoading(true);
      const res = await api.get(`/calendar-events?academicYear=${viewingAcademicYear}`);
      if (res.data?.success) {
        // Parse dates
        const parsedEvents = res.data.data.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        }));
        setEvents(parsedEvents);
      }
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEvents();
  }, [viewingAcademicYear]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !viewingAcademicYear) return;

    try {
      const payload = {
        ...formData,
        date: selectedDate.toISOString(),
        academicYear: viewingAcademicYear
        // createdBy / createdByRole are set server-side from the auth token,
        // so a teacher's event is automatically tagged as theirs.
      };

      const res = await api.post('/calendar-events', payload);
      if (res.data?.success) {
        toast.success('Event added successfully');
        setIsAddModalOpen(false);
        setFormData({ title: '', type: 'other', time: '', location: '', description: '' });
        fetchEvents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await api.delete(`/calendar-events/${eventId}`);
      if (res.data?.success) {
        toast.success('Event deleted');
        fetchEvents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    }
  };

  // A teacher may only delete events they created themselves — never
  // standard holidays and never anything created by an admin.
  const canDeleteEvent = (event: CalendarEvent) => {
    if (event.isStandardHoliday) return false;
    if (event.createdByRole && event.createdByRole !== 'teacher') return false;
    if (!event.createdBy || !user) return false;
return event.createdBy === (user as any).id || event.createdBy === (user as any)._id || event.createdBy === (user as any).userId;  };

  const allEvents = React.useMemo(() => {
    if (!viewingAcademicYear) return events;
    const standardHolidays = getStandardHolidays(viewingAcademicYear);
    // Combine backend events with standard holidays
    return [...events, ...standardHolidays];
  }, [events, viewingAcademicYear]);

  const upcomingEvents = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allEvents
      .filter(event => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [allEvents]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
    setIsSidebarOpen(true);
  };

  const getEventsForDay = (day: Date) => {
    return allEvents.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };

  const getTypeColor = (type: EventType) => {
    switch (type) {
      case 'holiday': return 'bg-red-100 text-red-700 border-red-200';
      case 'exam': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'meeting': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'other': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getBadgeColor = (type: EventType) => {
    switch (type) {
      case 'holiday': return 'bg-red-500';
      case 'exam': return 'bg-purple-500';
      case 'meeting': return 'bg-blue-500';
      case 'other': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const dayEvents = getEventsForDay(cloneDay);
      
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isTodayDate = isToday(day);

      days.push(
        <div
          key={day.toString()}
          onClick={() => onDateClick(cloneDay)}
          className={`
            relative min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-slate-100 transition-all duration-200 cursor-pointer group flex flex-col
            ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-slate-700'}
            ${isSelected ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/10 z-10' : 'hover:bg-slate-50'}
            ${i === 0 ? 'border-l' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`
              text-xs sm:text-sm font-semibold h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full
              ${isTodayDate ? 'bg-indigo-600 text-white shadow-sm' : ''}
              ${!isTodayDate && isSelected ? 'bg-indigo-100 text-indigo-700' : ''}
            `}>
              {formattedDate}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar mt-1">
            {dayEvents.map(event => (
              <div 
                key={event._id || event.title}
                className={`text-[9px] sm:text-[11px] leading-tight px-1 sm:px-1.5 py-0.5 sm:py-1 rounded border truncate font-medium flex items-center gap-1 sm:gap-1.5 ${getTypeColor(event.type)}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full hidden sm:block ${getBadgeColor(event.type)} shrink-0`}></span>
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
      {/* Non-sticky Header that scrolls away */}
      <div className="flex flex-col gap-6 pt-4 pb-2 -mt-4 bg-[#f8fafc] shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden mx-2 sm:mx-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-50 rounded-full blur-2xl opacity-60 -ml-10 -mb-10 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-xl flex items-center justify-center shadow-sm">
                <CalendarDays className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Calendar</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">View school events and holidays, and add your own class events</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setSelectedDate(new Date());
                  setIsSidebarOpen(true);
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Calendar Controls */}
      <div className="sticky top-[72px] z-[30] pt-2 pb-2 -mt-2 bg-[#f8fafc]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mx-2 sm:mx-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 min-w-[160px]">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToToday} className="px-3 py-1.5 rounded-md hover:bg-white hover:shadow-sm text-sm font-semibold text-slate-700 transition-all">
                Today
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search events..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid & Upcoming Events */}
      <div className="flex flex-col xl:flex-row gap-6 flex-1 mx-2 sm:mx-0">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-w-0">
          {/* Days Header */}
          <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                {day.substring(0, 3)}
              </div>
            ))}
          </div>
          
          {/* Calendar Body */}
          <div className="flex-1 border-t border-slate-100">
            {rows}
          </div>
        </div>

        {/* Upcoming Events Panel */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
               <span className="text-[18px]">🎉</span>
               <h3 className="text-[16px] font-bold text-slate-800 tracking-wide">Upcoming Events</h3>
            </div>
            {/* List */}
            <div className="flex-1 max-h-[600px] overflow-y-auto no-scrollbar flex flex-col divide-y divide-slate-100">
               {upcomingEvents.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-10 opacity-60">
                   <p className="text-slate-500 text-sm font-medium">No upcoming events.</p>
                 </div>
               ) : (
                 upcomingEvents.map((event, idx) => (
                   <div key={`${event._id}-${idx}`} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                     <div className="flex flex-col min-w-0 pr-4">
                       <h5 className="font-bold text-[14px] text-slate-700 truncate">{event.title}</h5>
                       <p className="text-[12px] text-slate-500 mt-1 truncate">{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</p>
                     </div>
                     <span className={`shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold capitalize ${
                       event.type === 'holiday' ? 'bg-blue-100 text-blue-600' :
                       event.type === 'exam' ? 'bg-purple-100 text-purple-600' :
                       event.type === 'meeting' ? 'bg-emerald-100 text-emerald-600' :
                       'bg-gray-100 text-gray-600'
                     }`}>
                       {event.type}
                     </span>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel for Event Details */}
      <AnimatePresence>
        {isSidebarOpen && selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
            >
              {/* Panel Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {format(selectedDate, 'EEEE')}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Events ({selectedDayEvents.length})
                  </h4>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add New
                  </button>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No events scheduled</p>
                    <p className="text-sm text-slate-400 mt-1">Enjoy your free day!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDayEvents.map(event => (
                      <div key={event._id} className={`p-4 rounded-xl border ${getTypeColor(event.type)} bg-opacity-50 relative group`}>
                        {canDeleteEvent(event) && (
                          <button 
                            onClick={() => event._id && handleDeleteEvent(event._id)}
                            className="absolute top-3 right-3 p-1.5 bg-white/60 hover:bg-red-100 hover:text-red-600 text-slate-400 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete Event"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <div className="flex items-start justify-between">
                          <h5 className="font-bold text-sm mb-2 pr-8">{event.title}</h5>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/50`}>
                            {event.type}
                          </span>
                        </div>
                        
                        {event.description && (
                          <p className="text-xs mb-3 opacity-90">{event.description}</p>
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
      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
              onClick={() => setIsAddModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800">
                    Add Event for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}
                  </h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Event Title *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                      placeholder="E.g. Parent-Teacher Meeting"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Event Type</label>
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as EventType})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
                      >
                        <option value="holiday">Holiday</option>
                        <option value="exam">Exam</option>
                        <option value="meeting">Meeting</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Time</label>
                      <input 
                        type="time" 
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Location</label>
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                      placeholder="E.g. Room 204"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
                      placeholder="Add any extra details..."
                    ></textarea>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                    >
                      Save Event
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;