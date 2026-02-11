import React, { useState, useEffect } from 'react';
import { chalanAPI } from '../../services/chalanAPI';
import { Chalan } from '../../types/chalan';
import { toast } from 'react-toastify';

// Helper function to format chalan number
const formatChalanNumber = (chalan: Chalan): string => {
  try {
    if (!chalan.chalanNumber) {
      console.warn('Missing chalanNumber for chalan:', chalan._id);
      return 'N/A';
    }
    
    const chalanNumber = chalan.chalanNumber.trim();
    
    // If it's already in the correct format, return as is
    if (/^[A-Z0-9]+-\d{6}-\d{4}$/i.test(chalanNumber)) {
      return chalanNumber.toUpperCase();
    }
    
    // If it has a CH- prefix, remove it
    if (chalanNumber.toUpperCase().startsWith('CH-')) {
      return chalanNumber.substring(3);
    }
    
    console.log('Chalan number format not recognized, returning as is:', chalanNumber);
    return chalanNumber;
  } catch (error) {
    console.error('Error formatting chalan number:', error, 'for chalan:', chalan);
    return 'ERR-' + (chalan._id || 'unknown').substring(0, 4);
  }
};

interface ChalanListProps {
  onViewChalan?: (chalan: Chalan) => void;
  onPrintChalan?: (chalan: Chalan) => void;
}

const ChalanList: React.FC<ChalanListProps> = ({ onViewChalan, onPrintChalan }) => {
  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    class: '',
    section: '',
    startDate: '',
    endDate: ''
  });

  const fetchChalans = React.useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching chalans with filters:', filters);
      const response = await chalanAPI.getChalans(filters);
      console.log('Received chalans:', response.data);
      
      // Ensure each chalan has a unique ID and valid chalanNumber
      const processedChalans = response.data.map((chalan: Chalan, index: number) => ({
        ...chalan,
        _id: chalan._id || `temp-${Date.now()}-${index}`,
        chalanNumber: chalan.chalanNumber || `TEMP-${Date.now()}-${index}`
      }));
      
      console.log('Processed chalans:', processedChalans);
      setChalans(processedChalans);
    } catch (error) {
      console.error('Error fetching chalans:', error);
      toast.error('Failed to load chalans');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchChalans();
  }, [fetchChalans]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="text-center py-4">Loading chalans...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <input
              type="text"
              name="class"
              value={filters.class}
              onChange={handleFilterChange}
              placeholder="Class"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <input
              type="text"
              name="section"
              value={filters.section}
              onChange={handleFilterChange}
              placeholder="Section"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chalan #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chalans.length > 0 ? (
                chalans.map((chalan) => (
                  <tr key={chalan._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                      {formatChalanNumber(chalan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {chalan.studentName || (typeof chalan.studentId === 'object' ? chalan.studentId?.name : null) || 'N/A'}
                      {chalan.admissionNumber && (
                        <span className="text-xs text-gray-400 block">Adm: {chalan.admissionNumber}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {chalan.class} - {chalan.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ₹{chalan.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(chalan.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        chalan.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {chalan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onViewChalan?.(chalan)}
                        disabled={chalan.status === 'paid'}
                        className={`mr-3 ${
                          chalan.status === 'paid'
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600 hover:text-blue-900'
                        }`}
                        title={chalan.status === 'paid' ? 'Cannot view paid chalans' : 'View chalan'}
                      >
                        View
                      </button>
                      <button
                        onClick={() => onPrintChalan?.(chalan)}
                        disabled={chalan.status === 'paid'}
                        className={chalan.status === 'paid'
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-green-600 hover:text-green-900'
                        }
                        title={chalan.status === 'paid' ? 'Cannot print paid chalans' : 'Print chalan'}
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No chalans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChalanList;
