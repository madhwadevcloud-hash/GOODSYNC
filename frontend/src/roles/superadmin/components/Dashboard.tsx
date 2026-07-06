import React, { useMemo, useState } from 'react';
import {
  Eye,
  CreditCard,
  Edit,
  Trash2,
  School,
  Users,
  Clock,
  FileText,
  Search,
  CheckCircle,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';
import { DeleteSchoolModal } from './DeleteSchoolModal';

const DONUT_COLORS = ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

export function Dashboard() {
  const { schools, stats, setCurrentView, setSelectedSchoolId, deleteSchool } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; schoolId: string; schoolName: string }>({ isOpen: false, schoolId: '', schoolName: '' });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleViewAccess = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setCurrentView('view-access');
  };

  const handleAccountDetails = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setCurrentView('account-details');
  };

  const handleSchoolDetails = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setCurrentView('school-details');
  };

  const handleEdit = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setCurrentView('edit-school');
  };

  const handleDeleteClick = (schoolId: string, name: string) => {
    setDeleteModal({ isOpen: true, schoolId, schoolName: name });
  };

  const handleDeleteConfirm = async (schoolId: string) => {
    try {
      await deleteSchool(schoolId);
      setDeleteModal({ isOpen: false, schoolId: '', schoolName: '' });
      setSuccessMessage(`School "${deleteModal.schoolName}" and all associated data have been permanently deleted.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      throw error; // Let modal handle the error
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, schoolId: '', schoolName: '' });
  };

  const statCards = [
    { title: 'Total Schools', value: stats.totalSchools, icon: School, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Last Login', value: stats.lastLogin || '--', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  // Real breakdown of schools by district (no fabricated data) - only shown if
  // there's more than one district worth distinguishing.
  const districtBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    schools.forEach((s) => {
      const key = s.district?.trim() || 'Unspecified';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [schools]);

  // Filter schools based on search query
  const filteredSchools = schools.filter((school) => {
    const query = searchQuery.toLowerCase();
    return (
      school.name.toLowerCase().includes(query) ||
      school.code?.toLowerCase().includes(query) ||
      school.area.toLowerCase().includes(query) ||
      school.district.toLowerCase().includes(query) ||
      school.principalName.toLowerCase().includes(query) ||
      school.principalEmail.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <DeleteSchoolModal
        isOpen={deleteModal.isOpen}
        schoolId={deleteModal.schoolId}
        schoolName={deleteModal.schoolName}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fadeIn">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3 animate-slideUp">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Welcome banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-8 opacity-0 animate-slideUp">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                School Management Dashboard
              </h1>
              <p className="text-indigo-100 mt-1 text-sm sm:text-base">
                Oversee every registered school from one place.
              </p>
            </div>
            <button
              onClick={() => setCurrentView('add-school')}
              className="bg-white text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors duration-200 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Add New School</span>
            </button>
          </div>
          {/* decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute right-16 bottom-[-3rem] w-28 h-28 rounded-full bg-white/10" />
        </div>

        {/* Stats + District breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 opacity-0 animate-slideUp"
                  style={{ animationDelay: `${100 + index * 70}ms` }}
                >
                  <div className={`${stat.bg} p-3 rounded-xl w-fit mb-3`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 opacity-0 animate-slideUp"
            style={{ animationDelay: '340ms' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">Schools by District</h2>
            </div>

            {districtBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No schools yet.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={districtBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={32}
                        outerRadius={50}
                        paddingAngle={2}
                      >
                        {districtBreakdown.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  {districtBreakdown.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="text-gray-600 truncate">{d.name}</span>
                      </span>
                      <span className="font-semibold text-gray-900 flex-shrink-0">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schools Grid */}
        <div
          className="bg-white rounded-xl border border-gray-200 opacity-0 animate-slideUp"
          style={{ animationDelay: '400ms' }}
        >
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Registered Schools</h2>
            </div>
            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search schools by name, code, area, district, principal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
              />
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {filteredSchools.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <School className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm sm:text-base text-gray-500">No schools found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredSchools.map((school, i) => (
                  <div
                    key={school.id}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md hover:border-indigo-200 transition-all duration-200 hover:-translate-y-0.5 opacity-0 animate-slideUp"
                    style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
                  >
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <img
                        src={school.logo}
                        alt={`${school.logo} logo`}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{school.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                            {school.code || 'No Code'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{school.area}, {school.district}</p>
                        <p className="text-xs sm:text-sm text-gray-600">PIN: {school.pinCode}</p>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Principal:</span>
                        <span className="text-xs sm:text-sm text-gray-600 truncate">{school.principalName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Contact:</span>
                        <span className="text-xs sm:text-sm text-gray-600">{school.mobile}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Email:</span>
                        <span className="text-xs sm:text-sm text-gray-600 truncate">{school.principalEmail}</span>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-6 flex flex-wrap gap-1 sm:gap-2">
                      <button
                        onClick={() => handleViewAccess(school.id)}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors duration-200 text-xs sm:text-sm font-medium"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">View Access</span>
                        <span className="sm:hidden">View</span>
                      </button>
                      <button
                        onClick={() => handleAccountDetails(school.id)}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors duration-200 text-xs sm:text-sm font-medium"
                      >
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Account Details</span>
                        <span className="sm:hidden">Account</span>
                      </button>
                      <button
                        onClick={() => handleSchoolDetails(school.id)}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 text-xs sm:text-sm font-medium"
                      >
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Details</span>
                      </button>
                      <button
                        onClick={() => handleEdit(school.id)}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs sm:text-sm font-medium"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(school.id, school.name)}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 text-xs sm:text-sm font-medium"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}