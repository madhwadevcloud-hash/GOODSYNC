import React, { useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  Send,
  MessageCircle,
  Clock,
  Calendar,
  Users,
  GraduationCap,
  ShieldCheck,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import { useSchoolClasses } from '../../../../hooks/useSchoolClasses';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import { sendTeacherMessage, previewTeacherMessageRecipients } from '../../../../api/message';

interface Message {
  id: string;
  class: string | null;
  section: string | null;
  adminId: string;
  title: string;
  subject: string;
  message: string;
  content: string;
  createdAt: string;
  timestamp: string;
  schoolId: string;
  messageAge: string;
  type: 'individual' | 'group';
  isRead: boolean;
  sender: string;
  senderName?: string;
  recipient: string[];
  recipientType?: string;
}

type RecipientType = 'students' | 'admin';

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const { classesData } = useSchoolClasses();

  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');

  // ---------------- Inbox state ----------------
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAcademicYear]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/messages/teacher/messages');
      const data = response.data;
      if (data?.success) {
        const fetchedMessages = data.messages || data.data?.messages || [];
        setMessages(fetchedMessages);
      } else {
        toast.error(data?.message || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // ---------------- Compose state ----------------
  const [recipientTypes, setRecipientTypes] = useState<RecipientType[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const classList = classesData?.classes?.map((c: any) => c.className) || [];

  const availableSections = useMemo(() => {
    if (!selectedClass || !classesData) return [];
    const cls = classesData.classes.find((c: any) => c.className === selectedClass);
    if (!cls) return [];
    const raw = cls.sections || [];
    return raw.map((s: any) => (typeof s === 'string' ? s : s.sectionName || s.value || String(s)));
  }, [selectedClass, classesData]);

  const toggleRecipientType = (type: RecipientType) => {
    setRecipientTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setRecipientCount(null);
  };

  const toggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
    setRecipientCount(null);
  };

  const wantsStudents = recipientTypes.includes('students');
  const wantsAdmin = recipientTypes.includes('admin');

  const canSend =
    title.trim() &&
    subject.trim() &&
    messageBody.trim() &&
    recipientTypes.length > 0 &&
    (!wantsStudents || (selectedClass && selectedSections.length > 0));

  const handlePreviewRecipients = async () => {
    if (recipientTypes.length === 0) return;
    setPreviewing(true);
    try {
      const result = await previewTeacherMessageRecipients({
        recipients: recipientTypes,
        class: wantsStudents ? selectedClass : undefined,
        sections: wantsStudents ? selectedSections : undefined,
      });
      setRecipientCount(result.data?.estimatedRecipients ?? 0);
    } catch (err) {
      console.error('Error previewing recipients:', err);
      setRecipientCount(null);
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    if (recipientTypes.length > 0 && (!wantsStudents || (selectedClass && selectedSections.length > 0))) {
      handlePreviewRecipients();
    } else {
      setRecipientCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientTypes, selectedClass, selectedSections]);

  const resetComposeForm = () => {
    setTitle('');
    setSubject('');
    setMessageBody('');
    setRecipientTypes([]);
    setSelectedClass('');
    setSelectedSections([]);
    setRecipientCount(null);
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload: any = {
        title,
        subject,
        message: messageBody,
        recipients: recipientTypes,
        academicYear: currentAcademicYear,
      };
      if (wantsStudents) {
        payload.class = selectedClass;
        payload.sections = selectedSections;
      }

      const response = await sendTeacherMessage(payload);
      if (response.success) {
        toast.success('Message sent successfully!');
        resetComposeForm();
        setActiveTab('inbox');
        fetchMessages();
      } else {
        toast.error(response.message || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error(err?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const recipientPill = (
    type: RecipientType,
    label: string,
    Icon: React.ElementType,
    activeClasses: string
  ) => {
    const active = recipientTypes.includes(type);
    return (
      <button
        type="button"
        onClick={() => toggleRecipientType(type)}
        className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
          active ? activeClasses : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Messages</h1>
          <p className="text-gray-500 text-sm">Read what admins send you, and message students or admins yourself</p>
        </div>

        {/* Academic Year Badge */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md">
          <Calendar className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-xs opacity-90">Academic Year</span>
            <span className="font-bold text-sm">{currentAcademicYear || 'Loading...'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'inbox'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Inbox className="h-4 w-4" strokeWidth={2.5} />
          Inbox
        </button>
        <button
          onClick={() => setActiveTab('compose')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'compose'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Send className="h-4 w-4" strokeWidth={2.5} />
          Compose
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Inbox</h2>
              <p className="text-sm text-gray-500 mt-1">
                Messages addressed to teachers, for academic year: <span className="font-semibold text-indigo-600">{currentAcademicYear}</span>
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin h-12 w-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length > 0 ? (
              <div className="p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100 hover:shadow-md transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{message.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                            {message.recipientType || (message.class ? `Class ${message.class}-${message.section}` : 'Teachers')}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600 font-medium">{message.subject}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-4">
                        <div className="flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {formatTimestamp(message.timestamp)}
                        </div>
                        <span className="text-xs text-gray-400 mt-1">
                          {new Date(message.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content || message.message}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-violet-100">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                          From {message.senderName || message.sender || 'Admin'}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 italic">{message.messageAge}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600">Messages addressed to teachers will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Compose a message</h2>
            <p className="text-sm text-gray-500">Choose who this goes to — you can pick more than one.</p>
          </div>

          {/* Recipient type multi-select */}
          <div className="flex flex-wrap gap-3">
            {recipientPill('students', 'Students', GraduationCap, 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200')}
            {recipientPill('admin', 'Admin', ShieldCheck, 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200')}
          </div>

          {/* Class/Section picker, only when Students is selected */}
          {wantsStudents && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSections([]);
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="">Select class</option>
                  {classList.map((cls: string) => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Sections <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSections.length === 0 && (
                    <span className="text-xs text-slate-400 italic py-2">
                      {selectedClass ? 'No sections found for this class' : 'Select a class first'}
                    </span>
                  )}
                  {availableSections.map((section: string) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => toggleSection(section)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        selectedSections.includes(section)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      Section {section}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recipient count */}
          {recipientTypes.length > 0 && (
            <div className={`rounded-lg p-3 flex items-center text-sm ${
              recipientCount === 0
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              {recipientCount === 0 ? <AlertCircle className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              {previewing
                ? 'Calculating recipients...'
                : recipientCount === null
                  ? 'Select recipients to see an estimate'
                  : `This message will reach ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`}
            </div>
          )}

          {/* Title / Subject / Body */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter message title"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              className={`inline-flex items-center px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm ${
                !canSend || sending
                  ? 'bg-violet-300 text-white cursor-not-allowed'
                  : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-md hover:shadow-violet-200/50 hover:-translate-y-0.5'
              }`}
            >
              {sending ? 'Sending...' : <><Send className="h-4 w-4 mr-2" strokeWidth={2.5} />Send Message</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;