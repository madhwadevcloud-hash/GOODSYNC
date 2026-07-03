import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import api from "../../../services/api";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  FileText,
  Printer,
  Building2,
  Calendar,
  ShieldCheck,
  PlusCircle,
  X
} from "lucide-react";
import ViewChalan from "../../../components/fees/ViewChalan";
import DualCopyReceipt from "../../../components/receipts/DualCopyReceipt";

interface Installment {
  name: string;
  amount: number;
  dueDate: string | null;
  paidAmount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
}

interface ChalanItem {
  id: string | null;
  chalanNumber: string;
  installmentName: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
  issueDate: string | null;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountHolderName: string;
}

interface FeeRecord {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  status: string;
  academicYear: string;
  feeStructureName: string;
  studentName: string;
  studentClass: string;
  studentSection: string;
  installments: Installment[];
}

interface FeesData {
  feeRecord: FeeRecord | null;
  challans: ChalanItem[];
  bankDetails: BankDetails | null;
  schoolName: string;
}

export default function Fees() {
  const { user } = useAuth();
  const [data, setData] = useState<FeesData>({
    feeRecord: null,
    challans: [],
    bankDetails: null,
    schoolName: "School Name"
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [isChalanOpen, setIsChalanOpen] = useState(false);
  const [selectedChalanForView, setSelectedChalanForView] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPayload, setReceiptPayload] = useState<any | null>(null);

  // Add Payment modal state (for installments)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Online");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/student/fees");
        if (res.data) {
          setData(res.data);
        }
      } catch (err: any) {
        console.error("Error fetching student fees:", err);
        setError(err.response?.data?.message || "Unable to load fees information.");
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const normalized = String(status).toUpperCase();
    switch (normalized) {
      case "PAID":
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "PARTIAL":
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "OVERDUE":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Displays "COMPLETED" instead of "PAID" for a friendlier label, without touching the underlying data model
  const getDisplayStatus = (status: string) => {
    return String(status).toUpperCase() === "PAID" ? "COMPLETED" : String(status).toUpperCase();
  };

  const handleViewChalan = (chalan: ChalanItem) => {
    if (!data.feeRecord) return;

    // Map ChalanItem and FeeRecord info to the shape ViewChalan modal expects (ChalanDetails)
    const chalanDetails = {
      chalanNumber: chalan.chalanNumber,
      chalanDate: chalan.issueDate || new Date().toISOString(),
      installmentName: chalan.installmentName,
      amount: chalan.amount,
      dueDate: chalan.dueDate || new Date().toISOString(),

      // Student details
      studentName: data.feeRecord.studentName,
      studentId: user?.id || user?.id || "",
      userId: user?.userId || "",
      className: data.feeRecord.studentClass,
      section: data.feeRecord.studentSection,
      academicYear: data.feeRecord.academicYear,

      // School details
      schoolName: data.schoolName,
      schoolAddress: "",

      // Bank details
      bankDetails: data.bankDetails || undefined,

      // Status mapping
      status: chalan.status === "PAID" ? "paid" as const : "unpaid" as const
    };

    setSelectedChalanForView(chalanDetails);
    setIsChalanOpen(true);
  };

  const handlePayChalan = async (chalan: ChalanItem) => {
    try {
      setLoading(true);
      setError("");

      // Try to record an offline/online payment for this student and installment
      // The API expects studentId (use user id or fallback) and payment payload
      const studentId = user?.id || user?.id || user?.id || '';
      const paymentPayload = {
        installmentName: chalan.installmentName,
        amount: chalan.amount,
        paymentMethod: 'Online',
        paymentDate: new Date().toISOString(),
        paymentReference: 'WEBPAY-' + String(Date.now()).slice(-6)
      };

      await recordPaymentAndRefresh(studentId, paymentPayload, chalan.installmentName);
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err?.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  // Opens the "Add Payment" modal for a specific pending/overdue installment
  const handleOpenAddPayment = (inst: Installment) => {
    const remaining = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
    setSelectedInstallment(inst);
    setPaymentAmount(String(remaining || inst.amount || 0));
    setPaymentMethod("Online");
    setPaymentError("");
    setIsAddPaymentOpen(true);
  };

  const handleCloseAddPayment = () => {
    setIsAddPaymentOpen(false);
    setSelectedInstallment(null);
    setPaymentAmount("");
    setPaymentError("");
  };

  // Shared logic: records a payment against the backend, refreshes fee data,
  // then surfaces the matching challan/receipt for that specific payment.
  const recordPaymentAndRefresh = async (
    studentId: string,
    paymentPayload: {
      installmentName: string;
      amount: number;
      paymentMethod: string;
      paymentDate: string;
      paymentReference: string;
    },
    installmentNameForChalan: string
  ) => {
    // Use the API helper if available
    // @ts-ignore
    if (api.recordOfflinePayment) {
      await (api as any).recordOfflinePayment(studentId, paymentPayload);
    } else {
      // fallback: attempt to POST to known endpoint
      await api.post(`/fees/records/${studentId}/offline-payment`, paymentPayload);
    }

    // refresh fees and challans so the installment flips to PAID/COMPLETED
    const res = await api.get('/student/fees');
    if (res.data) setData(res.data);

    const updatedFeeRecord = res.data?.feeRecord;
    const updatedChallans: ChalanItem[] = res.data?.challans || [];

    // Find the challan that matches this specific payment/installment
    const matchingChalan = updatedChallans.find(
      (c) => c.installmentName === installmentNameForChalan
    );

    if (matchingChalan) {
      // Show that particular payment's challan template right away
      handleViewChalanFromData(matchingChalan, updatedFeeRecord, res.data?.schoolName, res.data?.bankDetails);
    }

    // Also try to build a receipt if the backend returned payment history
    const latestPayment = (updatedFeeRecord?.payments || []).slice(-1)[0];
    if (latestPayment && latestPayment.receiptNumber) {
      const paymentData = {
        receiptNumber: latestPayment.receiptNumber,
        paymentDate: latestPayment.paymentDate || new Date().toISOString(),
        paymentMethod: latestPayment.paymentMethod || paymentPayload.paymentMethod,
        paymentReference: latestPayment.paymentReference || paymentPayload.paymentReference,
        amount: latestPayment.amount || paymentPayload.amount,
        installmentName: latestPayment.installmentName || paymentPayload.installmentName
      };

      const studentData = {
        name: updatedFeeRecord.studentName,
        studentId: user?.id || user?.id || updatedFeeRecord.studentName || '',
        userId: user?.userId || '',
        class: updatedFeeRecord.studentClass,
        section: updatedFeeRecord.studentSection,
        academicYear: updatedFeeRecord.academicYear
      };

      const schoolData = {
        schoolName: res.data?.schoolName || 'School Name',
        schoolCode: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        hasSchoolLogo: false,
        schoolLogo: undefined
      };

      const installments = (updatedFeeRecord?.installments || []).map((inst: any) => ({
        name: inst.name,
        amount: inst.amount,
        paid: inst.paidAmount || 0,
        remaining: Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0)),
        isCurrent: inst.name === paymentPayload.installmentName
      }));

      setReceiptPayload({
        paymentData,
        studentData,
        schoolData,
        installments,
        totalAmount: updatedFeeRecord.totalAmount,
        totalPaid: updatedFeeRecord.totalPaid,
        totalRemaining: updatedFeeRecord.totalPending
      });
    }
  };

  // Same mapping as handleViewChalan, but works off freshly-fetched data
  // instead of the (possibly stale) `data` state, so it can be called
  // immediately after a payment refresh.
  const handleViewChalanFromData = (
    chalan: ChalanItem,
    feeRecord: FeeRecord,
    schoolName: string,
    bankDetails: BankDetails | null
  ) => {
    if (!feeRecord) return;

    const chalanDetails = {
      chalanNumber: chalan.chalanNumber,
      chalanDate: chalan.issueDate || new Date().toISOString(),
      installmentName: chalan.installmentName,
      amount: chalan.amount,
      dueDate: chalan.dueDate || new Date().toISOString(),

      studentName: feeRecord.studentName,
      studentId: user?.id || user?.id || "",
      userId: user?.userId || "",
      className: feeRecord.studentClass,
      section: feeRecord.studentSection,
      academicYear: feeRecord.academicYear,

      schoolName: schoolName || "School Name",
      schoolAddress: "",

      bankDetails: bankDetails || undefined,

      status: chalan.status === "PAID" ? "paid" as const : "unpaid" as const
    };

    setSelectedChalanForView(chalanDetails);
    setIsChalanOpen(true);
  };

  const handleSubmitAddPayment = async () => {
    if (!selectedInstallment) return;

    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError("Please enter a valid amount.");
      return;
    }

    try {
      setSubmittingPayment(true);
      setPaymentError("");

      const studentId = user?.id || '';
      const paymentPayload = {
        installmentName: selectedInstallment.name,
        amount: amountNum,
        paymentMethod,
        paymentDate: new Date().toISOString(),
        paymentReference: 'WEBPAY-' + String(Date.now()).slice(-6)
      };

      await recordPaymentAndRefresh(studentId, paymentPayload, selectedInstallment.name);

      handleCloseAddPayment();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setPaymentError(err?.response?.data?.message || 'Failed to process payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80 text-gray-500 font-medium">
        <div className="animate-pulse mr-2">⏳</div> Loading Fees & Challans...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 font-medium">
        <h3 className="text-lg font-semibold mb-2">Error Loading Fees</h3>
        <p>{error}</p>
      </div>
    );
  }

  const { feeRecord, challans, bankDetails } = data;

  if (!feeRecord) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Fees & Challans</h1>
          <p className="text-gray-500 mt-2">View your fee breakdown and download challan slips.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700">No active fee record found</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any fee structures assigned for the current academic year.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Fees & Challans</h1>
          <p className="text-gray-500 mt-2">
            Academic Year: <span className="font-semibold text-gray-700">{feeRecord.academicYear}</span> | Structure: <span className="font-semibold text-gray-700">{feeRecord.feeStructureName}</span>
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-semibold shadow-sm ${getStatusBadge(feeRecord.status)}`}>
          Overall: {feeRecord.status.toUpperCase()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm font-medium">Total Fees</p>
            <h2 className="text-3xl font-bold mt-2 text-gray-900">{formatCurrency(feeRecord.totalAmount)}</h2>
            <p className="text-gray-400 text-xs mt-1">Assigned Annual Structure</p>
          </div>
          <CreditCard className="text-blue-500 bg-blue-50 p-2 rounded-xl" size={48} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm font-medium">Total Paid</p>
            <h2 className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(feeRecord.totalPaid)}</h2>
            <p className="text-gray-400 text-xs mt-1">Receipt Verified Payments</p>
          </div>
          <CheckCircle className="text-green-500 bg-green-50 p-2 rounded-xl" size={48} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm font-medium">Pending Balance</p>
            <h2 className={`text-3xl font-bold mt-2 ${feeRecord.totalPending > 0 ? "text-amber-600" : "text-gray-700"}`}>
              {formatCurrency(feeRecord.totalPending)}
            </h2>
            <p className="text-gray-400 text-xs mt-1">Remaining Outstanding Amount</p>
          </div>
          <AlertTriangle className={`${feeRecord.totalPending > 0 ? "text-amber-500 bg-amber-50" : "text-gray-400 bg-gray-50"} p-2 rounded-xl`} size={48} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Installment breakdown list */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Installment Breakdown</h2>
            </div>
            <div className="p-6 space-y-6">
              {feeRecord.installments.map((inst, index) => (
                <div key={index} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl hover:shadow-sm transition-all gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600 mt-1">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-base">{inst.name}</h4>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Due Date: <span className="font-medium text-gray-700">{inst.dueDate ? new Date(inst.dueDate).toLocaleDateString("en-GB") : "N/A"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-left md:text-right">
                      <p className="text-xs text-gray-400 font-medium">Installment Amount</p>
                      <p className="font-bold text-gray-900 text-base">{formatCurrency(inst.amount)}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs text-gray-400 font-medium">Paid Amount</p>
                      <p className="font-semibold text-green-600 text-base">{formatCurrency(inst.paidAmount)}</p>
                    </div>
                    <span className={`px-3 py-1 border text-xs font-semibold rounded-full ${getStatusBadge(inst.status)}`}>
                      {getDisplayStatus(inst.status)}
                    </span>
                    {(inst.status === "PENDING" || inst.status === "OVERDUE") && (
                      <button
                        onClick={() => handleOpenAddPayment(inst)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors shadow-sm"
                      >
                        <PlusCircle size={14} />
                        Add Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank details instruction */}
          {bankDetails && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Building2 className="text-blue-600 bg-white p-2.5 rounded-xl shadow-sm border border-blue-50" size={44} />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-blue-900">Offline Bank Deposit Details</h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    To make fee payments offline, please deposit to the following bank account or present the printed challan slip at any branch of the designated bank.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pt-2 text-sm">
                    <p className="text-blue-800"><span className="font-semibold text-blue-900">Bank Name:</span> {bankDetails.bankName}</p>
                    <p className="text-blue-800"><span className="font-semibold text-blue-900">Account No:</span> {bankDetails.accountNumber}</p>
                    <p className="text-blue-800"><span className="font-semibold text-blue-900">IFSC Code:</span> {bankDetails.ifscCode}</p>
                    <p className="text-blue-800"><span className="font-semibold text-blue-900">Account Holder:</span> {bankDetails.accountHolderName}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Challans column */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Generated Challans</h2>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-medium text-slate-600 border border-slate-200">
                {challans.length} slip(s)
              </span>
            </div>

            {challans.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No printable challan slips generated yet.
              </div>
            ) : (
              <div className="divide-y max-h-[460px] overflow-y-auto">
                {challans.map((ch, index) => (
                  <div key={index} className="p-5 hover:bg-slate-50 transition-colors space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{ch.chalanNumber}</h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{ch.installmentName}</p>
                      </div>
                      <span className={`px-2 py-0.5 border text-[10px] font-semibold rounded-full ${getStatusBadge(ch.status)}`}>
                        {getDisplayStatus(ch.status)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="text-gray-400 font-medium">Due Date</p>
                        <p className="text-gray-700 font-semibold">{ch.dueDate ? new Date(ch.dueDate).toLocaleDateString("en-GB") : "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 font-medium">Amount</p>
                        <p className="text-gray-900 font-bold text-sm">{formatCurrency(ch.amount)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewChalan(ch)}
                        className="flex-1 flex items-center justify-center gap-2 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm"
                      >
                        <Printer size={14} />
                        Print / View Challan
                      </button>

                      {ch.status !== 'PAID' && (
                        <button
                          onClick={() => handlePayChalan(ch)}
                          className="flex-none bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Secure transaction notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="text-slate-500 mt-0.5" size={20} />
            <div className="space-y-1">
              <h5 className="font-semibold text-slate-800 text-xs">Secure Records Enforced</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All outstanding bills and verified transaction logs are cryptographically sealed in the multi-tenant school directory.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddPaymentOpen && selectedInstallment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Add Payment</h3>
              <button onClick={handleCloseAddPayment} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 border rounded-lg p-3 text-sm">
              <p className="text-gray-500">Installment</p>
              <p className="font-semibold text-gray-800">{selectedInstallment.name}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Amount</label>
              <input
                type="number"
                min={1}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            {paymentError && (
              <p className="text-red-600 text-xs font-medium">{paymentError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCloseAddPayment}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddPayment}
                disabled={submittingPayment}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submittingPayment ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Challan Modal */}
      {selectedChalanForView && (
        <ViewChalan
          isOpen={isChalanOpen}
          onClose={() => {
            setIsChalanOpen(false);
            setSelectedChalanForView(null);
          }}
          chalan={selectedChalanForView}
        />
      )}

      {/* Receipt Modal (after payment) */}
      {isReceiptOpen && receiptPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg p-4 overflow-auto max-h-[90vh]">
            <div className="flex justify-end mb-2">
              <button onClick={() => setIsReceiptOpen(false)} className="text-sm px-3 py-1 rounded bg-gray-100">Close</button>
            </div>
            <DualCopyReceipt
              schoolData={receiptPayload.schoolData}
              studentData={receiptPayload.studentData}
              paymentData={receiptPayload.paymentData}
              installments={receiptPayload.installments}
              totalAmount={receiptPayload.totalAmount}
              totalPaid={receiptPayload.totalPaid}
              totalRemaining={receiptPayload.totalRemaining}
            />
          </div>
        </div>
      )}
    </div>
  );
}