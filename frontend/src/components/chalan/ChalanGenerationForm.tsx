import React, { useState, useEffect } from 'react';
import { chalanAPI } from '../../services/chalanAPI';
import { GenerateChalanData } from '../../types/chalan';
import { toast } from 'react-toastify';

interface Student {
  _id: string;
  name: string;
  rollNumber?: string;
  admissionNo?: string;
}

interface ChalanGenerationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  classes: string[];
  sections: string[];
  installments: string[];
}

const ChalanGenerationForm: React.FC<ChalanGenerationFormProps> = ({
  onSuccess,
  onCancel,
  classes = [],
  sections = [],
  installments = []
}) => {
  const [formData, setFormData] = useState<Omit<GenerateChalanData, 'studentIds'>>({
    class: '',
    section: '',
    installmentName: '',
    amount: 0,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days from now
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Define fetchStudents with useCallback to prevent unnecessary re-renders
  const fetchStudents = React.useCallback(async () => {
    if (formData.class && formData.section) {
      try {
        setIsLoadingStudents(true);
        // Replace with actual API call to fetch students
        // const response = await studentAPI.getStudentsByClassAndSection(formData.class, formData.section);
        // setStudents(response.data);
        
        // Mock data for now
        setStudents([
          { _id: '1', name: 'John Doe', rollNumber: '101' },
          { _id: '2', name: 'Jane Smith', rollNumber: '102' },
          { _id: '3', name: 'Bob Johnson', rollNumber: '103' },
        ]);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students');
      } finally {
        setIsLoadingStudents(false);
      }
    } else {
      setStudents([]);
      setSelectedStudents([]);
    }
  }, [formData.class, formData.section]);

  // Load students when class and section are selected
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(students.map(s => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.dueDate) {
      toast.error('Please select a due date');
      return;
    }

    try {
      setIsLoading(true);
      // Convert amount to number
      const dataToSend = {
        ...formData,
        amount: Number(formData.amount),
        studentIds: selectedStudents,
      };
      
      console.log('Sending chalan data:', dataToSend);
      
      const response = await chalanAPI.generateChalans(dataToSend);
      
      console.log('Chalan generation response:', response);
      
      if (response && response.success) {
        toast.success(`Successfully generated ${response.data?.length || 0} chalans`);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(response?.message || 'Failed to generate chalans');
      }
    } catch (error: any) {
      console.error('Error generating chalans:', error);
      toast.error(error.message || 'Failed to generate chalans');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Generate Fee Chalans</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              name="class"
              value={formData.class}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              name="section"
              value={formData.section}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Enter amount"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Installment</label>
            <select
              name="installmentName"
              value={formData.installmentName}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Full Amount</option>
              {installments.map(inst => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-medium">Select Students</h3>
            {students.length > 0 && (
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2">Select All</span>
              </label>
            )}
          </div>

          <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
            {isLoadingStudents ? (
              <div className="text-center py-4">Loading students...</div>
            ) : students.length > 0 ? (
              <ul className="space-y-2">
                {students.map(student => (
                  <li key={student._id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`student-${student._id}`}
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => handleStudentSelect(student._id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`student-${student._id}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {student.name} {student.rollNumber && `(${student.rollNumber})`}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {formData.class && formData.section 
                  ? 'No students found for the selected class and section' 
                  : 'Please select class and section to view students'}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || selectedStudents.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : `Generate ${selectedStudents.length} Chalan(s)`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChalanGenerationForm;
