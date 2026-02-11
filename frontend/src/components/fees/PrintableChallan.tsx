import React from 'react';
import { Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';

interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
}

interface StudentDetails {
  name: string;
  studentId: string;
  classSection: string;
  academicYear: string;
}

interface PaymentDetails {
  installment: string;
  amount: number;
  dueDate: string;
  status?: string;
}

interface SchoolDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface PrintableChallanProps {
  schoolDetails: SchoolDetails;
  bankDetails: BankDetails;
  studentDetails: StudentDetails;
  paymentDetails: PaymentDetails;
  challanNumber: string;
  issueDate: string;
}

const PrintableChallan: React.FC<PrintableChallanProps> = ({
  schoolDetails,
  bankDetails,
  studentDetails,
  paymentDetails,
  challanNumber,
  issueDate,
}) => {
  const challanRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => challanRef.current,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const renderChallanCopy = (copyType: 'STUDENT' | 'OFFICE' | 'ADMIN') => {
    const copyTypeLower = copyType.toLowerCase();
    const copyLabel = `${copyType} COPY`;
    
    return (
      <div className={`challan-copy ${copyTypeLower}-copy`}>
        <div className="header">
          <div className="institute-name">{schoolDetails.name}</div>
          <div className="institute-details">
            {schoolDetails.address}<br />
            Phone: {schoolDetails.phone}<br />
            Email: {schoolDetails.email}
          </div>
          <div className="challan-title">FEE PAYMENT CHALLAN</div>
          <div className="academic-year">Academic Year: {studentDetails.academicYear}</div>
          <span className="copy-type">{copyLabel}</span>
        </div>

        <div className="challan-number">Challan: {challanNumber}</div>

        <div className="content-section">
          <div className="info-group">
            <div className="info-title">Bank Details:</div>
            <div className="info-row">
              <span className="info-label">Bank Name:</span>
              <span className="info-value">{bankDetails.bankName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Account Holder:</span>
              <span className="info-value">{bankDetails.accountHolder}</span>
            </div>
            <div className="info-row">
              <span className="info-label">A/c No:</span>
              <span className="info-value">{bankDetails.accountNumber}</span>
            </div>
            <div className="info-row">
              <span className="info-label">IFSC Code:</span>
              <span className="info-value">{bankDetails.ifscCode}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Branch:</span>
              <span className="info-value">{bankDetails.branch}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date:</span>
              <span className="info-value">{formatDate(issueDate)}</span>
            </div>
          </div>

          <div className="info-group">
            <div className="info-title">Student Details</div>
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{studentDetails.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Student ID:</span>
              <span className="info-value">{studentDetails.studentId || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Class & Sec:</span>
              <span className="info-value">{studentDetails.classSection}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Academic Year:</span>
              <span className="info-value">{studentDetails.academicYear}</span>
            </div>
          </div>

          <div className="info-group">
            <div className="info-title">Payment Details:</div>
            <div className="info-row">
              <span className="info-label">Installment:</span>
              <span className="info-value">{paymentDetails.installment}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Amount:</span>
              <span className="info-value">{formatCurrency(paymentDetails.amount)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Due Date:</span>
              <span className="info-value">{formatDate(paymentDetails.dueDate)}</span>
            </div>
          </div>
        </div>

        <div className="payment-status">
          {paymentDetails.status ? paymentDetails.status.toUpperCase() : 'PENDING'}
        </div>
        <div className="branding">EduLogix - Institute Management System</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
        >
          Print Challan
        </Button>
      </div>

      <div ref={challanRef} className="challan-container">
        {renderChallanCopy('STUDENT')}
        {renderChallanCopy('OFFICE')}
        {renderChallanCopy('ADMIN')}
      </div>
    </div>
  );
};

export default PrintableChallan;