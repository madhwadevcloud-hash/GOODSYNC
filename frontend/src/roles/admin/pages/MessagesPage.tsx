import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  MessageSquare,
  Eye,
  AlertCircle,
  Users,
  Clock,
  Mail,
  BookOpen,
  Trash2,
  Maximize2,
  Inbox,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { toast } from 'react-hot-toast';
import {
  getMessages,
  sendMessage as sendMessageAPI,
  previewMessageRecipients,
  deleteMessage as deleteMessageAPI,
  getStaffMessages
} from '../../../api/message';

interface StaffMessage {
  id: string;
  title: string;
  subject: string;
  message: string;
  senderName: string;
  senderRole: string;
  audience: string[];
  class: string | null;
  section: string | null;
  createdAt: string;
  messageAge: string;
}

// Define Message type based on the NEW backend controller format
interface Message {
  id: string;
  class: string;
  section: string;
  adminId: string;
  adminName?: string;
  title: string;
  subject: string;
  message: string;
  createdAt: string;
  messageAge: string;
  urgencyIndicator: string;
  // Add these for delete functionality
  _id?: string; // MongoDB _id field
  schoolId?: string;
  academicYear?: string;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    hasClasses
  } = useSchoolClasses();

  // Academic year context
  const { currentAcademicYear, viewingAcademicYear, isViewingHistoricalYear, setViewingYear, availableYears } = useAcademicYear();

  // Form state (for sending a new message) - defaults to empty string to enforce selection
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedClass, setSelectedClass] = useState(''); // Changed from 'ALL'
  const [selectedSections, setSelectedSections] = useState<string[]>([]); // multi-select
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [recipientCount, setRecipientCount] = useState<number>(0);

  // Sent Messages List filter state
  const [messagesFilterClass, setMessagesFilterClass] = useState('ALL'); // 'ALL' for filtering
  const [messagesFilterSection, setMessagesFilterSection] = useState('ALL'); // 'ALL' for filtering
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 5;

  // UI state for sending
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

  // Preview state
  const [messageToPreview, setMessageToPreview] = useState<Message | null>(null);

  // Tabs: compose/read own messages, vs reading messages sent BY teachers ("Staff Messages")
  const [activeTab, setActiveTab] = useState<'compose' | 'staff'>('compose');
  const [staffMessages, setStaffMessages] = useState<StaffMessage[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const fetchStaffMessages = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const result = await getStaffMessages({ academicYear: viewingAcademicYear });
      setStaffMessages(result.data?.messages || []);
    } catch (err: any) {
      console.error('❌ Error fetching staff messages:', err);
      setStaffError('Failed to load messages sent by teachers.');
      toast.error('Failed to load staff messages.');
    } finally {
      setStaffLoading(false);
    }
  }, [viewingAcademicYear]);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffMessages();
    }
  }, [activeTab, fetchStaffMessages]);

  // Get class list from superadmin configuration
  const classList = classesData?.classes?.map(c => c.className) || [];

  // Helper function to format date
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Fetch messages from the backend
  const fetchMessages = useCallback(async (page: number, currentClass: string, currentSection: string) => {
    console.log('📥 [FRONTEND] fetchMessages called with:', { page, currentClass, currentSection, viewingAcademicYear });
    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const params = {
        page,
        limit: LIMIT,
        class: currentClass === 'ALL' ? undefined : currentClass,
        section: currentSection === 'ALL' ? undefined : currentSection,
        academicYear: viewingAcademicYear, // Always filter by viewing academic year
      };

      console.log('🔍 [FRONTEND] Fetching messages with params:', params);
      const result = await getMessages(params);
      console.log('📦 [FRONTEND] API Response:', result);
      console.log('📨 [FRONTEND] Messages received:', result.data?.messages?.length || 0);

      // Get all messages - backend already filters by academic year
      let allMessages = result.data.messages || [];
      console.log('📋 [FRONTEND] All messages from API:', allMessages);
      console.log(`📊 [FRONTEND] Received ${allMessages.length} messages for academic year: ${viewingAcademicYear}`);

      // Backend already handles filtering, so we can use messages directly
      // But let's log each message for debugging
      allMessages.forEach((msg: Message, index: number) => {
        console.log(`📝 [FRONTEND] Message ${index + 1}:`, {
          title: msg.title,
          class: msg.class,
          section: msg.section,
          academicYear: msg.academicYear || 'NONE (treated as current year)',
          createdAt: msg.createdAt
        });
      });

      setMessages(allMessages);
      setCurrentPage(result.data.pagination?.page || 1);
      setTotalPages(result.data.pagination?.pages || 1);

    } catch (err: any) {
      console.error('❌ [FRONTEND] Error fetching messages:', err);
      console.error('❌ [FRONTEND] Error response:', err.response);
      setMessagesError('Failed to load sent messages.');
      toast.error('Failed to load sent messages.');
    } finally {
      setMessagesLoading(false);
    }
  }, [viewingAcademicYear, currentAcademicYear]);

  // Initial fetch of messages and refetch on filter change
  useEffect(() => {
    fetchMessages(1, messagesFilterClass, messagesFilterSection);
  }, [fetchMessages, messagesFilterClass, messagesFilterSection]);

  // Update available sections when class changes (for the SEND NEW MESSAGE form)
  useEffect(() => {
    // If no class is selected (empty string)
    if (!selectedClass || selectedClass === 'ALL') {
      setAvailableSections([]); // No sections to choose from
      setSelectedSections([]); // Clear section
      return;
    }

    // Logic for a specific class
    if (classesData) {
      const selectedClassData = classesData.classes.find(c => c.className === selectedClass);

      if (selectedClassData) {
        // Map sections to the expected format.
        const rawSections = selectedClassData.sections || [];

        // Robust mapping to extract section name correctly and ensure section options appear
        const sections = rawSections.map((s: any) => {
          // Handle data structure that is an object { sectionName: 'A' } or potentially just the string 'A'
          const sectionName = s.sectionName || s;
          return {
            value: sectionName, // The actual value to be sent to the API (e.g., 'A')
            section: sectionName // The display value (e.g., 'A')
          };
        });

        setAvailableSections(sections);

        // Reset selections that are no longer valid
        const currentValidSections = sections.map((s: any) => s.value);
        setSelectedSections(prev => prev.filter(s => s === 'teacher' || currentValidSections.includes(s)));

      } else {
        // Class exists but no sections defined
        setAvailableSections([]);
        setSelectedSections([]);
      }
    }
  }, [selectedClass, classesData]);

  // Preview recipients when class/sections changes
  useEffect(() => {
    if (selectedClass && selectedSections.length > 0 && selectedClass !== 'ALL') {
      previewRecipients(selectedClass, selectedSections);
    } else {
      setRecipientCount(0);
    }
  }, [selectedClass, selectedSections]);

  const previewRecipients = async (targetClass: string, targetSections: string[]) => {
    try {
      const result = await previewMessageRecipients({
        class: targetClass,
        sections: targetSections
      });
      setRecipientCount(result.data?.estimatedRecipients || 0);
    } catch (err: any) {
      console.error('Error previewing recipients:', err);
      setRecipientCount(0);
    }
  };

  // Preview message
  const handlePreview = () => {
    if (!title.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!selectedClass || selectedClass === 'ALL') {
      setError('Please select a specific Class to send a message');
      return;
    }
    if (selectedSections.length === 0) {
      setError('Please select at least one Section or Teacher to send a message');
      return;
    }

    setError(null);
    setShowPreviewModal(true);
  };

  // Send message
  const handleSendMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setShowPreviewModal(false);

      if (!selectedClass || selectedClass === 'ALL' || selectedSections.length === 0) {
        throw new Error('Please select a specific Class and at least one Section/Teacher to send a message.');
      }

      const payload = {
        class: selectedClass,
        sections: selectedSections,
        title,
        subject,
        message,
        academicYear: currentAcademicYear
      };

      console.log('📤 Sending message with payload:', payload);
      const response = await sendMessageAPI(payload);
      console.log('✅ Backend response:', response);

      if (response.success) {
        setSuccess('Message sent successfully!');
        setTitle('');
        setSubject('');
        setMessage('');
        setSelectedClass('');
        setSelectedSections([]);
        setRecipientCount(0);
        fetchMessages(1, messagesFilterClass, messagesFilterSection);
        toast.success('Message sent successfully!');
      } else {
        throw new Error(response.message || 'Failed to send message');
      }

    } catch (error: any) {
      setError(error.message || 'Failed to send message');
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Delete message function
  const handleDeleteMessage = async (messageId: string) => {
    try {
      setDeleteLoading(messageId);

      const response = await deleteMessageAPI(messageId);

      if (response.success) {
        toast.success('Message deleted successfully!');
        // Refresh the messages list
        fetchMessages(currentPage, messagesFilterClass, messagesFilterSection);
      } else {
        throw new Error(response.message || 'Failed to delete message');
      }
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error(error.message || 'Failed to delete message');
    } finally {
      setDeleteLoading(null);
      setMessageToDelete(null);
    }
  };

  // Confirm delete modal
  const confirmDelete = (message: Message) => {
    setMessageToDelete(message);
  };

  const cancelDelete = () => {
    setMessageToDelete(null);
    setDeleteLoading(null);
  };

  // Preview message details
  const previewMessageDetails = (message: Message) => {
    // Create a safe message object with fallbacks
    const safeMessage = {
      ...message,
      title: message.title || 'No Title',
      subject: message.subject || 'No Subject',
      message: message.message || 'No Message Content',
      class: message.class || 'N/A',
      section: message.section || 'N/A',
      createdAt: message.createdAt || '',
      messageAge: message.messageAge || 'Unknown',
      urgencyIndicator: message.urgencyIndicator || 'normal'
    };
    setMessageToPreview(safeMessage);
  };

  const closePreview = () => {
    setMessageToPreview(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchMessages(newPage, messagesFilterClass, messagesFilterSection);
    }
  };

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper: toggle a section value in the multi-select
  const toggleSection = (value: string) => {
    setSelectedSections(prev => {
      if (value === 'select_all') {
        // 'Select All' toggles all student sections (but not teacher)
        const allSectionValues = availableSections.map((s: any) => s.value);
        const hasTeacher = prev.includes('teacher');
        const allStudentSelected = allSectionValues.every((v: string) => prev.includes(v));
        if (allStudentSelected) {
          // Deselect all student sections, keep teacher if selected
          return hasTeacher ? ['teacher'] : [];
        } else {
          // Select all student sections, keep teacher if selected
          return hasTeacher ? [...allSectionValues, 'teacher'] : allSectionValues;
        }
      }
      // Toggle individual option
      return prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value];
    });
  };

  // Helper: label for the multi-select button
  const getSectionButtonLabel = () => {
    if (!selectedClass) return 'Select Class First';
    if (selectedSections.length === 0) return 'Select Recipients';
    const labels = selectedSections.map(s => s === 'teacher' ? 'Teachers' : `Section ${s}`);
    return labels.join(', ');
  };

  const renderClassSectionSelector = () => {
    if (classesLoading) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading classes...</span>
          </div>
        </div>
      );
    }

    if (classesError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-red-800 font-medium">Error Loading Classes</h3>
          </div>
          <p className="text-red-700 mt-1 text-sm">{classesError}</p>
        </div>
      );
    }

    if (!hasClasses() || classList.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-yellow-800 font-medium">No Classes Configured</h3>
          </div>
          <p className="text-yellow-700 mt-1 text-sm">
            No classes have been defined for this school. Please contact the Super Admin to add classes and sections.
          </p>
        </div>
      );
    }

    // Compute Select-All state
    const allSectionValues = availableSections.map((s: any) => s.value);
    const allStudentSectionsSelected =
      allSectionValues.length > 0 && allSectionValues.every((v: string) => selectedSections.includes(v));
    const someStudentSectionsSelected = allSectionValues.some((v: string) => selectedSections.includes(v));
    const teacherSelected = selectedSections.includes('teacher');

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Class Selection */}
          <div>
            <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSectionDropdownOpen(false); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Class</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Multi-Select Section / Teacher Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              id="section-multiselect"
              disabled={!selectedClass}
              onClick={() => setSectionDropdownOpen(prev => !prev)}
              className={`w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!selectedClass ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
            >
              <span className="truncate text-sm">{getSectionButtonLabel()}</span>
              <svg className={`h-4 w-4 ml-2 flex-shrink-0 transition-transform ${sectionDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown panel */}
            {sectionDropdownOpen && selectedClass && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <ul className="py-1 max-h-60 overflow-auto">
                  {/* Select All option */}
                  {availableSections.length > 0 && (
                    <li>
                      <label className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allStudentSectionsSelected}
                          ref={el => {
                            if (el) el.indeterminate = someStudentSectionsSelected && !allStudentSectionsSelected;
                          }}
                          onChange={() => toggleSection('select_all')}
                          className="accent-blue-600"
                        />
                        <span className="text-sm font-semibold text-gray-800">Select All Sections</span>
                      </label>
                    </li>
                  )}

                  {/* Individual sections */}
                  {availableSections.map((section: any) => (
                    <li key={section.value}>
                      <label className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.value)}
                          onChange={() => toggleSection(section.value)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">Section {section.section}</span>
                      </label>
                    </li>
                  ))}

                  {/* Divider */}
                  <li className="border-t border-gray-100 my-1" />

                  {/* Teacher option */}
                  <li>
                    <label className="flex items-center gap-2 px-4 py-2 hover:bg-purple-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={teacherSelected}
                        onChange={() => toggleSection('teacher')}
                        className="accent-purple-600"
                      />
                      <span className="text-sm font-semibold text-purple-700">🧑‍🏫 Teachers</span>
                    </label>
                  </li>
                </ul>

                {/* Close button */}
                <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSectionDropdownOpen(false)}
                    className="text-xs text-blue-600 font-medium hover:underline"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recipient Count Display */}
        {recipientCount > 0 && selectedClass && selectedSections.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              This message will be sent to <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? 's' : ''} in
              {' '}Class <strong>{selectedClass}</strong> — {getSectionButtonLabel()}
            </span>
          </div>
        )}
        {recipientCount === 0 && selectedClass && selectedSections.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              No recipients found for the selected options.
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderMessageFilter = () => {
    const filterClassOptions = [{ name: 'ALL Classes', value: 'ALL' }, ...classList.map(cls => ({ name: `Class ${cls}`, value: cls }))];

    let filterSectionOptions = [{ name: 'ALL Sections', value: 'ALL' }];
    if (messagesFilterClass !== 'ALL' && classesData) {
      const selectedClassData = classesData.classes.find(c => c.className === messagesFilterClass);
      if (selectedClassData) {
        const rawSections = selectedClassData.sections || [];
        const sections = rawSections.map((s: any) => {
          const sectionName = s.sectionName || s;
          return { name: `Section ${sectionName}`, value: sectionName };
        });
        filterSectionOptions = [...filterSectionOptions, ...sections];
      }
    }

    return (
      <div className="flex space-x-4 mb-4">
        {/* Academic Year Filter */}
        <div className="w-1/3">
          <label htmlFor="filter-academic-year" className="block text-xs font-medium text-gray-500 mb-1">
            Filter by Academic Year
          </label>
          <input
            type="text"
            value={`${currentAcademicYear} (Current)`}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </div>

        {/* Class Filter */}
        <div className="w-1/3">
          <label htmlFor="filter-class" className="block text-xs font-medium text-gray-500 mb-1">
            Filter by Class
          </label>
          <select
            id="filter-class"
            value={messagesFilterClass}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {filterClassOptions.map((option) => (
              <option key={`filter-class-${option.value}`} value={option.value}>{option.name}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div className="w-1/3">
          <label htmlFor="filter-section" className="block text-xs font-medium text-gray-500 mb-1">
            Filter by Section
          </label>
          <select
            id="filter-section"
            value={messagesFilterSection}
            onChange={(e) => setMessagesFilterSection(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={messagesFilterClass === 'ALL' && filterSectionOptions.length === 1}
          >
            {filterSectionOptions.map((option) => (
              <option key={`filter-section-${option.value}`} value={option.value}>{option.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      <div className="sticky top-[72px] z-20 flex flex-col gap-4 pt-4 pb-2 -mt-4 bg-[#f8fafc]">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden mx-2 sm:mx-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-xl flex items-center justify-center shadow-sm">
                <MessageSquare className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messages</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Send announcements and stay in the loop with your staff</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mx-2 sm:mx-0">
          <button
            onClick={() => setActiveTab('compose')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'compose'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Send className="h-4 w-4" strokeWidth={2.5} />
            Compose &amp; Sent
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'staff'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Inbox className="h-4 w-4" strokeWidth={2.5} />
            Staff Messages
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 mb-6 mx-2 sm:mx-0">
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <GraduationCap className="h-5 w-5 mr-2 text-indigo-500" strokeWidth={2.5} />
            Messages sent by teachers
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Everything teachers have sent — to admins, to other teachers, or to a class — shows up here.
          </p>

          {staffError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {staffError}</span>
              <button onClick={fetchStaffMessages} className="ml-4 text-sm font-semibold underline">Retry</button>
            </div>
          )}

          {staffLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-slate-500 font-medium">Loading staff messages...</span>
            </div>
          ) : staffMessages.length === 0 ? (
            <div className="text-center py-16">
              <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-700">No messages from teachers yet</h3>
              <p className="text-sm text-slate-400 mt-1">Anything teachers send will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {staffMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                          <GraduationCap className="h-3.5 w-3.5" /> {msg.senderName || 'Teacher'}
                        </span>
                        {msg.audience?.includes('admin') && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">To Admin</span>
                        )}
                        {msg.audience?.includes('teacher') && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">To Teachers</span>
                        )}
                        {msg.audience?.includes('student') && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            To Class {msg.class}{msg.section ? `-${msg.section}` : ''}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{msg.title}</h3>
                      <p className="text-sm font-medium text-slate-500">{msg.subject}</p>
                    </div>
                    <div className="flex items-center text-xs text-slate-400 gap-1 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5" /> {msg.messageAge}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-100">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'compose' && (
      <>
      {/* Send New Message Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 mb-6 mx-2 sm:mx-0">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
          <Send className="h-5 w-5 mr-2 text-indigo-500" strokeWidth={2.5} />
          Compose New Message
        </h2>

        {/* Class and Section Selection */}
        <div className="mb-6">
          {renderClassSectionSelector()}
        </div>

        <div className="grid grid-cols-1 gap-5 mb-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter message title"
              disabled={!hasClasses() || classList.length === 0}
            />
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
              disabled={!hasClasses() || classList.length === 0}
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="message"
              rows={5}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={!hasClasses() || classList.length === 0}
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handlePreview}
            disabled={!hasClasses() || classList.length === 0 || !title || !message || !selectedClass || selectedSections.length === 0}
            className="inline-flex items-center px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="h-4 w-4 mr-2" strokeWidth={2.5} /> Preview
          </button>
          <button
            onClick={handleSendMessage}
            disabled={loading || !hasClasses() || classList.length === 0 || !title || !message || !selectedClass || selectedSections.length === 0}
            className={`inline-flex items-center px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm ${
              loading || !hasClasses() || classList.length === 0 || !title || !message || !selectedClass || selectedSections.length === 0
                ? 'bg-indigo-300 text-white cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200/50 hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'Sending...' : <><Send className="h-4 w-4 mr-2" strokeWidth={2.5} />Send Message</>}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-8 border w-full max-w-md md:max-w-lg lg:max-w-xl shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Message Preview</h3>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Title:</p>
              <p className="text-gray-900 font-semibold">{title}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Subject:</p>
              <p className="text-gray-900 font-semibold">{subject}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Message Body:</p>
              <p className="text-gray-800 whitespace-pre-wrap">{message}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Target Audience:</p>
              <p className="text-gray-800">
                Class {selectedClass} — {getSectionButtonLabel()}
                {recipientCount > 0 && (
                  <span className="text-blue-600 font-semibold"> ({recipientCount} recipients)</span>
                )}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
              >
                {loading ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sent Messages List */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 mx-2 sm:mx-0">
        <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
          <Mail className="h-5 w-5 mr-2 text-indigo-500" strokeWidth={2.5} /> Sent Messages
        </h2>
        <p className="text-sm text-slate-500 mb-5">Everything you've sent to students and teachers.</p>

        {/* Message Filtering UI */}
        {renderMessageFilter()}

        {messagesError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {messagesError}</span>
            <button onClick={() => fetchMessages(currentPage, messagesFilterClass, messagesFilterSection)} className="ml-4 text-sm font-semibold underline">Retry</button>
          </div>
        )}

        {messagesLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-slate-500 font-medium">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700">No sent messages found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting the filters above.</p>
          </div>
        ) : (
          <>
            {/* Messages Card List */}
            <div className="space-y-4">
              {messages.map((message) => {
                const title = message.title || '';
                const subject = message.subject || '';
                const messageText = message.message || '';
                const messageClass = message.class || '';
                const messageSection = message.section || '';
                const createdAt = message.createdAt || '';
                const messageAge = message.messageAge || '';
                const messageLength = messageText.length;

                return (
                  <div
                    key={message.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:shadow-sm transition-all p-5"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Class {messageClass}{messageSection ? `-${messageSection}` : ''}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{truncateText(title, 60)}</h3>
                        <p className="text-sm font-medium text-slate-500">{truncateText(subject, 80)}</p>
                      </div>
                      <div className="flex items-center text-xs text-slate-400 gap-1 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5" /> {formatDateTime(createdAt)} · {messageAge}
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-100">
                      {truncateText(messageText, 160)}
                    </p>

                    <div className="flex items-center justify-end gap-2 mt-3">
                      {messageLength > 160 && (
                        <button
                          onClick={() => previewMessageDetails(message)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <Maximize2 className="h-3.5 w-3.5" /> View full
                        </button>
                      )}
                      <button
                        onClick={() => previewMessageDetails(message)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                        title="Preview message"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => confirmDelete(message)}
                        disabled={deleteLoading === message.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white border border-red-100 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete message"
                      >
                        {deleteLoading === message.id ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-6 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <h3 className="text-lg font-bold text-red-800">Confirm Delete</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this message?
              </p>
              <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200">
                <p className="font-semibold text-gray-900 break-words">{messageToDelete.title}</p>
                <p className="text-sm text-gray-600">Class {messageToDelete.class} - Section {messageToDelete.section}</p>
                <p className="text-xs text-gray-500 mt-1 break-words">{messageToDelete.message}</p>
              </div>
              <p className="text-xs text-red-600 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={deleteLoading === messageToDelete.id}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMessage(messageToDelete.id)}
                disabled={deleteLoading === messageToDelete.id}
                className={`px-4 py-2 text-white rounded-md ${deleteLoading === messageToDelete.id
                  ? 'bg-red-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
                  } transition-colors`}
              >
                {deleteLoading === messageToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Preview Modal */}
      {/* Message Preview Modal */}
      {messageToPreview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white mx-4">
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded">
              <div className="flex items-center">
                <Eye className="h-5 w-5 text-green-400 mr-2" />
                <h3 className="text-xl font-bold text-green-800">Message Details</h3>
              </div>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Title:</p>
                <p className="text-gray-900 font-semibold break-words">{messageToPreview.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                <p className="text-gray-900 font-semibold break-words">{messageToPreview.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Class & Section:</p>
                <p className="text-gray-800">Class {messageToPreview.class} - Section {messageToPreview.section}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Sent:</p>
                <p className="text-gray-800">{formatDateTime(messageToPreview.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Message Body:</p>
                <div className="mt-1 p-3 bg-green-50 rounded-md border border-green-200">
                  <p className="text-gray-800 whitespace-pre-wrap break-words">{messageToPreview.message}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-green-100 text-green-800 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;