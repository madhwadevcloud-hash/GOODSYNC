import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import api from "../../../services/api";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  ShieldCheck,
  Eye,
  Lock,
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

interface PaymentRecord {
  receiptNumber: string;
  installmentName: string;
  amount: number;
  paymentDate: string | null;
  paymentMethod: string;
  paymentReference?: string;
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
  payments: PaymentRecord[];
  bankDetails: BankDetails | null;
  schoolName: string;
}

export default function Fees() {
  const { user } = useAuth();
  const [data, setData] = useState<FeesData>({
    feeRecord: null,
    challans: [],
    payments: [],
    bankDetails: null,
    schoolName: "School Name"
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Printable challan modal state
  const [isChalanOpen, setIsChalanOpen] = useState(false);
  const [selectedChalanForView, setSelectedChalanForView] = useState<any>(null);

  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPayload, setReceiptPayload] = useState<any | null>(null);

  const [loadingChalanFor, setLoadingChalanFor] = useState<string | null>(null);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/student/fees");
        if (res.data) {
          setData({ ...res.data, payments: res.data.payments || [] });
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

  const getDisplayStatus = (status: string) => {
    return String(status).toUpperCase() === "PAID" ? "COMPLETED" : String(status).toUpperCase();
  };

  const getCurrentPayableInstallmentName = (installments: Installment[]): string | null => {
    const current = installments.find((inst) => String(inst.status).toUpperCase() !== "PAID");
    return current ? current.name : null;
  };

  const refreshFees = async () => {
    const res = await api.get("/student/fees");
    if (res.data) setData({ ...res.data, payments: res.data.payments || [] });
    return res.data;
  };

  const fetchInstallmentChalan = async (installmentName: string) => {
    const res = await api.post("/student/fees/challan", { installmentName });
    return res.data?.data;
  };

  const handleViewChalanForInstallment = async (inst: Installment) => {
    try {
      setLoadingChalanFor(inst.name);
      setError("");

      const chalanData = await fetchInstallmentChalan(inst.name);
      if (!chalanData) return;

      const chalanDetails = {
        chalanNumber: chalanData.chalanNumber,
        chalanDate: chalanData.issueDate || new Date().toISOString(),
        installmentName: chalanData.installmentName,
        amount: chalanData.amount,
        dueDate: chalanData.dueDate || new Date().toISOString(),

        studentName: chalanData.studentName,
        studentId: chalanData.studentId || user?.id || "",
        userId: chalanData.userId || user?.userId || "",
        className: chalanData.className,
        section: chalanData.section,
        academicYear: chalanData.academicYear,

        schoolName: chalanData.schoolName || data.schoolName,
        schoolAddress: "",
        schoolData: chalanData.schoolData,

        bankDetails: chalanData.bankDetails || data.bankDetails || undefined,

        status: chalanData.status === "paid" ? "paid" as const : "unpaid" as const
      };

      setSelectedChalanForView(chalanDetails);
      setIsChalanOpen(true);

      refreshFees().catch(() => {});
    } catch (err: any) {
      console.error("Error fetching challan:", err);
      setError(err?.response?.data?.message || "Failed to load challan");
    } finally {
      setLoadingChalanFor(null);
    }
  };

  const handleViewChalan = (chalan: ChalanItem) => {
    if (!data.feeRecord) return;

    const chalanDetails = {
      chalanNumber: chalan.chalanNumber,
      chalanDate: chalan.issueDate || new Date().toISOString(),
      installmentName: chalan.installmentName,
      amount: chalan.amount,
      dueDate: chalan.dueDate || new Date().toISOString(),

      studentName: data.feeRecord.studentName,
      studentId: user?.id || "",
      userId: user?.userId || "",
      className: data.feeRecord.studentClass,
      section: data.feeRecord.studentSection,
      academicYear: data.feeRecord.academicYear,

      schoolName: data.schoolName,
      schoolAddress: "",

      bankDetails: data.bankDetails || undefined,

      status: chalan.status === "PAID" ? "paid" as const : "unpaid" as const
    };

    setSelectedChalanForView(chalanDetails);
    setIsChalanOpen(true);
  };

  // Opens a receipt (payment already made) using the DualCopyReceipt component,
  // which has its own built-in Download PDF button.
  const handleViewReceipt = (payment: PaymentRecord) => {
    if (!data.feeRecord) return;

    const studentData = {
      name: data.feeRecord.studentName,
      studentId: user?.id || "",
      userId: user?.userId || "",
      class: data.feeRecord.studentClass,
      section: data.feeRecord.studentSection,
      academicYear: data.feeRecord.academicYear
    };

    const schoolData = {
      schoolName: data.schoolName || "School Name",
      schoolCode: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      hasSchoolLogo: false,
      schoolLogo: undefined
    };

    const paymentData = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate || new Date().toISOString(),
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      amount: payment.amount,
      installmentName: payment.installmentName
    };

    const installments = data.feeRecord.installments.map((inst) => ({
      name: inst.name,
      amount: inst.amount,
      paid: inst.paidAmount || 0,
      remaining: Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0)),
      isCurrent: inst.name === payment.installmentName
    }));

    setReceiptPayload({
      paymentData,
      studentData,
      schoolData,
      installments,
      totalAmount: data.feeRecord.totalAmount,
      totalPaid: data.feeRecord.totalPaid,
      totalRemaining: data.feeRecord.totalPending
    });
    setIsReceiptOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80 text-gray-500 font-medium">
        <div className="animate-pulse mr-2">⏳</div> Loading Fees & Receipts...
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

  const { feeRecord, challans, payments, bankDetails } = data;

  if (!feeRecord) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Fees & Receipts</h1>
          <p className="text-gray-500 mt-2">View your fee breakdown and download receipt slips.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700">No active fee record found</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any fee structures assigned for the current academic year.</p>
        </div>
      </div>
    );
  }

  const currentPayableInstallmentName = getCurrentPayableInstallmentName(feeRecord.installments);

  // Progress bar: how much of the total fee has been cleared so far
  const clearedPercentage = feeRecord.totalAmount > 0
    ? Math.min(100, Math.round((feeRecord.totalPaid / feeRecord.totalAmount) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Fees & Receipts</h1>
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

      {/* Progress bar: overall amount cleared */}
      <div className="bg-white rounded-full shadow-sm border px-6 py-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          {formatCurrency(feeRecord.totalPaid)} of {formatCurrency(feeRecord.totalAmount)} cleared
        </span>
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${clearedPercentage}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 w-10 text-right">{clearedPercentage}%</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Installment breakdown list */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Installment Breakdown</h2>
              <p className="text-xs text-gray-500 mt-1">Payments are collected by the school office. Installments must be cleared in order.</p>
            </div>
            <div className="p-6 space-y-6">
              {feeRecord.installments.map((inst, index) => {
                const isPaid = String(inst.status).toUpperCase() === "PAID";
                const isCurrent = inst.name === currentPayableInstallmentName;
                const isLocked = !isPaid && !isCurrent;

                return (
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

                      {isCurrent && (
                        <button
                          onClick={() => handleViewChalanForInstallment(inst)}
                          disabled={loadingChalanFor === inst.name}
                          className="flex items-center gap-1.5 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-semibold py-2 px-3 rounded-xl text-xs transition-all shadow-sm disabled:opacity-60"
                        >
                          <Eye size={14} />
                          {loadingChalanFor === inst.name ? "Loading..." : "View Challan"}
                        </button>
                      )}

                      {isLocked && (
                        <span className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                          <Lock size={14} />
                          Complete earlier installment first
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
                    Fee payments are collected by the school office. Please refer to the challan for the bank account details, or contact the office directly.
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

        {/* Receipts column — the single source of truth for completed payments */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Receipts</h2>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-medium text-slate-600 border border-slate-200">
                {payments.length} transaction{payments.length === 1 ? "" : "s"}
              </span>
            </div>

            {payments.length > 0 && (
              <div className="px-6 py-3 border-b bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">Total Amount Paid</span>
                <span className="text-sm font-bold text-green-700">
                  {formatCurrency(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                </span>
              </div>
            )}

            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No receipts generated yet.
              </div>
            ) : (
              <div className="divide-y max-h-[460px] overflow-y-auto">
                {payments.map((p, index) => (
                  <div key={index} className="p-5 hover:bg-slate-50 transition-colors space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{p.receiptNumber}</h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{p.installmentName}</p>
                      </div>
                      <span className="px-2 py-0.5 border text-[10px] font-semibold rounded-full bg-green-100 text-green-700 border-green-200">
                        PAID
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="text-gray-400 font-medium">Payment Date</p>
                        <p className="text-gray-700 font-semibold">
                          {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-GB") : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 font-medium">Amount</p>
                        <p className="text-gray-900 font-bold text-sm">{formatCurrency(p.amount)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewReceipt(p)}
                      className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm"
                    >
                      <Eye size={14} />
                      View / Download
                    </button>
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

      {/* Receipt Modal */}
      {isReceiptOpen && receiptPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg p-4 overflow-auto max-h-[90vh]">
            <div className="flex justify-end mb-2">
              <button onClick={() => setIsReceiptOpen(false)} className="text-sm px-3 py-1 rounded bg-gray-100 flex items-center gap-1">
                <X size={14} /> Close
              </button>
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