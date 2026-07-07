import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, X, Download, Clock, CheckCircle, AlertTriangle, AlertCircle, Loader, Bell } from 'lucide-react';
import api from '../../../services/api';

interface Request {
  _id: string;
  schoolCode: string;
  schoolName: string;
  requestedBy: string;
  requestedByName: string;
  fromYear: string;
  toYear: string;
  promotionDate: string;
  effectiveDate: string;
  totalStudents: number;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Completed';
  rejectionReason?: string;
  excelReportUrl?: string;
  createdAt: string;
  auditLog: Array<{
    action: string;
    doneBy: string;
    timestamp: string;
    details: string;
  }>;
}

interface PromotionTabProps {
  schoolCode?: string; // Optional: if viewing a specific school
}

export function SuperAdminPromotionTab({ schoolCode }: PromotionTabProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'History'>('Pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Tracks whether we've completed the very first load. Background polls
  // should never flip `loading` back to true - that's what was tearing down
  // the whole card list and flashing the spinner every 10 seconds.
  const hasLoadedOnce = useRef(false);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    try {
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      const resp = await api.get('/admin/promotion/requests');
      if (resp.data.success) {
        let list = resp.data.data || [];
        if (schoolCode) {
          list = list.filter((r: Request) => r.schoolCode?.trim().toLowerCase() === schoolCode.trim().toLowerCase());
        }
        // Only trigger a re-render if the data actually changed. The API
        // returns a brand-new array/object graph on every poll even when
        // nothing changed, which otherwise forces the whole list to
        // re-render (and visibly flicker) every 10 seconds for no reason.
        setRequests(prev => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
    }
  }, [schoolCode]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const resp = await api.get('/admin/promotion/notifications');
      if (resp.data.success) {
        const fresh = resp.data.data;
        setNotifications(prev => (JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh));
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/admin/promotion/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDownloadReport = async (url: string, schoolCode: string, fromYear: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const excelBlob = new Blob([blob], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `promotion_report_${schoolCode}_${fromYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading report:', error);
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchRequests();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRequests, fetchNotifications]);

  // Approve request
  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const resp = await api.post(`/admin/promotion/request/${id}/approve`);
      if (resp.data.success) {
        alert('Promotion request approved successfully!');
        fetchRequests();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject request
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectionReason.trim()) return;

    try {
      setProcessingId(rejectingId);
      const resp = await api.post(`/admin/promotion/request/${rejectingId}/reject`, {
        rejectionReason
      });
      if (resp.data.success) {
        alert('Promotion request rejected.');
        setRejectingId(null);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter requests by current active subtab
  const filteredRequests = requests.filter((r) => {
    if (activeSubTab === 'History') return true;
    if (activeSubTab === 'Pending') return r.status === 'Pending Approval';
    return r.status === activeSubTab;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert Center */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif._id} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-indigo-600" />
                <div>
                  <h5 className="font-semibold text-sm text-indigo-900">{notif.title}</h5>
                  <p className="text-xs text-indigo-700">{notif.message}</p>
                </div>
              </div>
              <button 
                onClick={() => handleMarkAsRead(notif._id)}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 p-1.5 rounded-full"
                title="Mark as Read"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Navigation sub-tabs */}
      <div className="border-b border-gray-200 bg-white p-2 rounded-lg flex flex-wrap gap-2">
        {(['Pending', 'Approved', 'Rejected', 'Completed', 'History'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              activeSubTab === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab === 'Pending' ? 'Pending Approval' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600 font-medium font-semibold">Loading promotion requests...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          {activeSubTab === 'Pending' ? (
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          ) : activeSubTab === 'Completed' ? (
            <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          ) : (
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          )}
          <p className="text-lg font-semibold text-gray-600">No requests found</p>
          <p className="text-sm mt-1 text-gray-400">There are no promotion requests in the "{activeSubTab}" category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredRequests.map((req, i) => (
            <div
              key={req._id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 opacity-0 animate-slideUp"
              style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{req.schoolName}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">School Code: {req.schoolCode} • Requested By: {req.requestedByName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    req.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Promotion Cycle</p>
                  <p className="font-semibold text-gray-800 mt-1">{req.fromYear} → {req.toYear}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Promotion Date</p>
                  <p className="font-semibold text-gray-800 mt-1">{new Date(req.promotionDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Effective Date</p>
                  <p className="font-semibold text-gray-800 mt-1">{new Date(req.effectiveDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Eligible Students</p>
                  <p className="font-semibold text-gray-800 mt-1">{req.totalStudents}</p>
                </div>
              </div>

              {req.status === 'Rejected' && req.rejectionReason && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
                  <strong>Rejection Reason:</strong> {req.rejectionReason}
                </div>
              )}

              {/* Action Buttons for Super Admin */}
              {req.status === 'Pending Approval' && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleApprove(req._id)}
                    disabled={processingId !== null}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:bg-gray-400"
                  >
                    <Check className="h-4 w-4" />
                    Approve Request
                  </button>
                  <button
                    onClick={() => setRejectingId(req._id)}
                    disabled={processingId !== null}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:bg-gray-400"
                  >
                    <X className="h-4 w-4" />
                    Reject Request
                  </button>
                </div>
              )}

              {/* Rejection input box */}
              {rejectingId === req._id && (
                <form onSubmit={handleRejectSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Mandatory Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                      placeholder="Specify why you are rejecting this request..."
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectionReason('');
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </form>
              )}

              {/* Download Report link for Completed */}
              {req.status === 'Completed' && req.excelReportUrl && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-semibold">
                    Promotion Cycle Completed
                  </span>
                  <button
                    onClick={() => handleDownloadReport(req.excelReportUrl!, req.schoolCode, req.fromYear)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Promotion Report (Excel)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}