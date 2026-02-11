interface StudentData {
  name: string;
  rollNumber: string;
  sequenceNumber: string;
  class: string;
  section: string;
  academicYear: string;
  address: string;
  email: string;
  phone: string;
  parentName: string;
}

interface FeeStructure {
  feeName: string;
  amount: number;
  totalAmount: number;
  pendingAmount: number;
  payments: any[];
}

interface PaymentData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  totalPaid: number;
  totalFees: number;
  remainingFees: number;
}

interface SchoolData {
  schoolName: string;
  schoolCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export const generateInvoice = (
  studentData: StudentData,
  feeStructure: FeeStructure[],
  paymentData: PaymentData,
  schoolData: SchoolData
) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('en-IN', { weekday: 'long' });
    const dateFormatted = date.toLocaleDateString('en-IN');
    return dateFormatted + ' (' + day + ')';
  };

  const formatCurrency = (amount: number) => {
    return 'INR ' + amount.toLocaleString('en-IN');
  };

  const totalPending = feeStructure.reduce((sum, fee) => sum + (fee.pendingAmount || 0), 0);
  const pendingInstallments = feeStructure.filter((fee) => fee.pendingAmount > 0);

  const feeRows = feeStructure.map(fee =>
    '<tr><td>' + fee.feeName + '</td><td class="amount">' + formatCurrency(fee.amount) + '</td><td class="amount">' + formatCurrency(fee.pendingAmount) + '</td></tr>'
  ).join('');

  const pendingRows = pendingInstallments.map(fee =>
    '<div class="detail-row"><span>' + fee.feeName + ':</span><span class="value">' + formatCurrency(fee.pendingAmount) + '</span></div>'
  ).join('');

  const pendingSection = pendingInstallments.length > 0
    ? '<div style="margin-top:15px;"><div class="section-title">Pending Installments</div>' + pendingRows + '</div>'
    : '<div style="margin-top:15px;text-align:center;color:#16a34a;font-weight:bold;">✓ All installments paid</div>';

  const rollLabel = (studentData.rollNumber && studentData.rollNumber !== 'null' && studentData.rollNumber !== 'N/A') ? 'Roll Number' : 'Student ID';
  const rollValue = (studentData.rollNumber && studentData.rollNumber !== 'null' && studentData.rollNumber !== 'N/A') ? studentData.rollNumber : studentData.sequenceNumber;

  const htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payment Receipt</title><style>@page{size:A4 landscape;margin:8mm;}body{font-family:Arial,sans-serif;margin:0;padding:0;font-size:11px;line-height:1.3;}.container{width:100%;height:60vh;display:flex;flex-direction:row;}.copy-section{flex:1;border-right:2px dashed #ccc;padding-right:5mm;margin-right:5mm;display:flex;flex-direction:column;}.copy-section:last-child{border-right:none;margin-right:0;}.header{display:flex;flex-direction:column;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #3b82f6;}.school-info{text-align:center;margin-bottom:8px;}.school-info h1{margin:0;font-size:14px;color:#1f2937;}.school-info p{margin:1px 0;font-size:9px;color:#666;}.copy-type{background:#3b82f6;color:white;padding:3px 8px;border-radius:3px;font-size:10px;font-weight:bold;}.title{text-align:center;margin-bottom:10px;}.title h2{margin:0;font-size:12px;color:#1f2937;text-transform:uppercase;letter-spacing:1px;}.content{margin-bottom:10px;}.section-title{font-size:10px;font-weight:bold;margin-bottom:5px;color:#1f2937;}.detail-row{display:flex;justify-content:space-between;margin-bottom:2px;font-size:9px;}.detail-row .value{font-weight:bold;}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:9px;}th,td{border:1px solid #ddd;padding:3px;text-align:left;}th{background:#f8f9fa;font-weight:bold;}.amount{text-align:right;font-weight:bold;}.copy-footer{text-align:center;margin-top:auto;font-size:8px;color:#666;border-top:1px solid #eee;padding-top:5px;}.footer{position:absolute;bottom:5mm;left:0;right:0;text-align:center;font-size:8px;color:#666;}.edulogix{display:flex;align-items:center;justify-content:center;gap:3px;margin-top:3px;}.edulogix strong{color:#2563eb;}</style></head><body><div class="container"><div class="copy-section"><div class="header"><div class="school-info"><h1>' + schoolData.schoolName + '</h1><p>' + schoolData.address + '</p><p>Phone: ' + schoolData.phone + '</p></div><div class="copy-type">ADMIN COPY</div></div><div class="title"><h2>PAYMENT RECEIPT</h2></div><div class="content"><div class="section-title">Student Details</div><div class="detail-row"><span>Name:</span><span class="value">' + studentData.name + '</span></div><div class="detail-row"><span>' + rollLabel + ':</span><span class="value">' + rollValue + '</span></div><div class="detail-row"><span>Class:</span><span class="value">' + studentData.class + '-' + studentData.section + '</span></div><div class="section-title" style="margin-top:8px;">Payment Details</div><div class="detail-row"><span>Receipt:</span><span class="value">' + paymentData.receiptNumber + '</span></div><div class="detail-row"><span>Date:</span><span class="value">' + formatDate(paymentData.paymentDate) + '</span></div><div class="detail-row"><span>Method:</span><span class="value">' + paymentData.paymentMethod + '</span></div></div><table><thead><tr><th>Installment</th><th class="amount">Paid</th><th class="amount">Pending</th></tr></thead><tbody>' + feeRows + '</tbody></table>' + pendingSection + '<div class="copy-footer"><div>This is a computer generated copy.</div></div></div><div class="copy-section"><div class="header"><div class="school-info"><h1>' + schoolData.schoolName + '</h1><p>' + schoolData.address + '</p><p>Phone: ' + schoolData.phone + '</p></div><div class="copy-type">STUDENT COPY</div></div><div class="title"><h2>PAYMENT RECEIPT</h2></div><div class="content"><div class="section-title">Student Details</div><div class="detail-row"><span>Name:</span><span class="value">' + studentData.name + '</span></div><div class="detail-row"><span>' + rollLabel + ':</span><span class="value">' + rollValue + '</span></div><div class="detail-row"><span>Class:</span><span class="value">' + studentData.class + '-' + studentData.section + '</span></div><div class="section-title" style="margin-top:8px;">Payment Details</div><div class="detail-row"><span>Receipt:</span><span class="value">' + paymentData.receiptNumber + '</span></div><div class="detail-row"><span>Date:</span><span class="value">' + formatDate(paymentData.paymentDate) + '</span></div><div class="detail-row"><span>Method:</span><span class="value">' + paymentData.paymentMethod + '</span></div></div><table><thead><tr><th>Installment</th><th class="amount">Paid</th><th class="amount">Pending</th></tr></thead><tbody>' + feeRows + '</tbody></table>' + pendingSection + '<div class="copy-footer"><div>This is a computer generated copy.</div></div></div></div><div class="footer"><div class="edulogix"><span>Powered by</span><strong>EduLogix</strong></div></div></body></html>';

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  }
};

export default generateInvoice;