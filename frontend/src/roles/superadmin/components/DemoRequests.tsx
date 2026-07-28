import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Search, Mail, Phone, User, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

interface DemoRequestRecord {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
}

export function DemoRequests() {
  const [requests, setRequests] = useState<DemoRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDemoRequests = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const resp = await api.get('/demo-requests');
      if (resp.data.success) {
        setRequests(resp.data.data || []);
      }
    } catch (err: any) {
      console.error('[DemoRequests] fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load demo requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDemoRequests();
  }, [fetchDemoRequests]);

  const filteredRequests = requests.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(query) ||
      r.email?.toLowerCase().includes(query) ||
      r.phone?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-8 opacity-0 animate-slideUp">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white/15 p-3 rounded-2xl flex-shrink-0">
              <CalendarCheck className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Demo Requests</h1>
              <p className="text-indigo-100 mt-1 text-sm sm:text-base">
                Everyone who has requested a GOODSYNK ERP demo from the website.
              </p>
            </div>
          </div>
          <button
            onClick={fetchDemoRequests}
            className="bg-white text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors duration-200 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center font-semibold shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute right-16 bottom-[-3rem] w-28 h-28 rounded-full bg-white/10" />
      </div>

      {/* Stat card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 opacity-0 animate-slideUp" style={{ animationDelay: '100ms' }}>
          <div className="bg-indigo-50 p-3 rounded-xl w-fit mb-3">
            <User className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-gray-500">Total Demo Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{requests.length}</p>
        </div>
      </div>

      {/* Requests list */}
      <div className="bg-white rounded-xl border border-gray-200 opacity-0 animate-slideUp" style={{ animationDelay: '180ms' }}>
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Requests</h2>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600 font-medium">Loading demo requests...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 sm:py-12">
              <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-red-300 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500">{error}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <CalendarCheck className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500">
                {requests.length === 0 ? 'No demo requests yet.' : 'No demo requests match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                    <th className="px-4 sm:px-2 py-3">Name</th>
                    <th className="px-4 sm:px-2 py-3">Email</th>
                    <th className="px-4 sm:px-2 py-3">Phone</th>
                    <th className="px-4 sm:px-2 py-3">Requested On</th>
                    <th className="px-4 sm:px-2 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req, i) => (
                    <tr
                      key={req._id}
                      className="opacity-0 animate-slideUp hover:bg-gray-50 transition-colors"
                      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                    >
                      <td className="px-4 sm:px-2 py-3 font-semibold text-gray-900 whitespace-nowrap">{req.name}</td>
                      <td className="px-4 sm:px-2 py-3 text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {req.email}
                        </span>
                      </td>
                      <td className="px-4 sm:px-2 py-3 text-gray-600 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {req.phone}
                        </span>
                      </td>
                      <td className="px-4 sm:px-2 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 sm:px-2 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            req.status === 'new'
                              ? 'bg-yellow-100 text-yellow-800'
                              : req.status === 'contacted'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
