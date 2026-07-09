import { useEffect, useState } from "react";
import {
  User,
  GraduationCap,
  Briefcase,
  Phone,
  Mail,
  CalendarDays,
  MapPin,
  Globe,
  Droplets,
  Hash,
} from "lucide-react";
import { useAuth } from "../../../../auth/AuthContext";
import api from "../../../../services/api";

interface TeacherProfile {
  teacherName: string | null;
  employeeId: string | null;
  department: string | null;
  designation: string | null;
  qualification: string | null;
  experience: string | null;
  joiningDate: string | null;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  nationality: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  profileImage?: string | null;
}

const mapTeacherProfile = (raw: any): TeacherProfile => {
  const teacherDetails = raw?.teacherDetails || {};
  const addressInfo = raw?.address || {};
  const permanentAddress = addressInfo?.permanent || {};

  const fullName =
    raw?.name?.displayName ||
    [raw?.name?.firstName, raw?.name?.lastName].filter(Boolean).join(" ") ||
    raw?.name ||
    null;

  const qualification =
    (typeof teacherDetails?.qualification === "string"
      ? teacherDetails.qualification
      : teacherDetails?.qualification?.highest) ||
    raw?.qualification ||
    null;

  const experience =
    teacherDetails?.experience?.total != null
      ? `${teacherDetails.experience.total} years`
      : teacherDetails?.experience ||
        raw?.experience ||
        null;

  const address =
    [permanentAddress.street, permanentAddress.area].filter(Boolean).join(", ") ||
    addressInfo?.street ||
    raw?.address ||
    null;

  return {
    teacherName: fullName,
    employeeId: teacherDetails?.employeeId || raw?.employeeId || raw?.userId || null,
    department: teacherDetails?.department || raw?.department || null,
    designation: teacherDetails?.designation || raw?.designation || null,
    qualification,
    experience,
    joiningDate: teacherDetails?.joiningDate || raw?.joiningDate || null,
    dob: teacherDetails?.dateOfBirth || raw?.dateOfBirth || raw?.dob || null,
    gender: teacherDetails?.gender || raw?.gender || null,
    bloodGroup: teacherDetails?.bloodGroup || raw?.bloodGroup || null,
    nationality: teacherDetails?.nationality || raw?.nationality || null,
    email: raw?.email || null,
    mobile: raw?.contact?.primaryPhone || raw?.phone || raw?.mobile || null,
    address,
    city: permanentAddress.city || addressInfo?.city || raw?.city || null,
    state: permanentAddress.state || addressInfo?.state || raw?.state || null,
    pinCode: permanentAddress.pincode || addressInfo?.pincode || raw?.pinCode || null,
    profileImage: raw?.profileImage || raw?.profilePicture || null,
  };
};

export default function TeacherProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.userId) {
      setError("Unable to load profile");
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get('/users/my-profile').catch(() => null);
        const payload = response?.data?.data ?? response?.data ?? null;

        if (payload) {
          setProfile(mapTeacherProfile(payload));
          return;
        }

        const fallbackResponse = await api.get(`/users/${user.userId}`);
        const fallbackPayload = fallbackResponse.data?.data ?? fallbackResponse.data ?? null;
        setProfile(fallbackPayload ? mapTeacherProfile(fallbackPayload) : null);
      } catch {
        setError("Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.userId]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "--";

    const d = new Date(value);

    if (isNaN(d.getTime())) return "--";

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const fallback = (value: string | null | undefined) => value || "--";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        Loading profile...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12">
        <div className="flex flex-col items-center text-gray-500">
          <User size={48} className="mb-4 text-gray-300" />
          <h3 className="text-lg font-medium">Profile not available</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Profile</h1>
            <p className="mt-2 text-sm text-gray-500">
              View your personal and professional information.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={fallback(profile.teacherName)}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={46} className="text-blue-600" />
            )}
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900">{fallback(profile.teacherName)}</h2>
            <p className="mt-2 text-gray-500">Employee ID : {fallback(profile.employeeId)}</p>
            <p className="text-gray-500">{fallback(profile.designation)}</p>
            <p className="text-gray-500">{fallback(profile.department)}</p>
          </div>
        </div>
      </div>

      <SectionTitle icon={<User />} title="Personal Information" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">
        <Info icon={<CalendarDays size={18} />} label="Date of Birth" value={formatDate(profile.dob)} />
        <Info icon={<User size={18} />} label="Gender" value={fallback(profile.gender)} />
        <Info icon={<Droplets size={18} />} label="Blood Group" value={fallback(profile.bloodGroup)} />
        <Info icon={<Globe size={18} />} label="Nationality" value={fallback(profile.nationality)} />
      </div>

      <SectionTitle icon={<Briefcase />} title="Professional Information" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">
        <Info icon={<Hash size={18} />} label="Employee ID" value={fallback(profile.employeeId)} />
        <Info icon={<GraduationCap size={18} />} label="Department" value={fallback(profile.department)} />
        <Info icon={<Briefcase size={18} />} label="Designation" value={fallback(profile.designation)} />
        <Info icon={<GraduationCap size={18} />} label="Qualification" value={fallback(profile.qualification)} />
        <Info icon={<Briefcase size={18} />} label="Experience" value={fallback(profile.experience)} />
        <Info icon={<CalendarDays size={18} />} label="Joining Date" value={formatDate(profile.joiningDate)} />
      </div>

      <SectionTitle icon={<Phone />} title="Contact Information" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">
        <Info icon={<Mail size={18} />} label="Email" value={fallback(profile.email)} />
        <Info icon={<Phone size={18} />} label="Mobile" value={fallback(profile.mobile)} />
      </div>

      <SectionTitle icon={<MapPin />} title="Address Information" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">
        <Info icon={<MapPin size={18} />} label="Address" value={fallback(profile.address)} />
        <Info icon={<MapPin size={18} />} label="City" value={fallback(profile.city)} />
        <Info icon={<MapPin size={18} />} label="State" value={fallback(profile.state)} />
        <Info icon={<Hash size={18} />} label="Pin Code" value={fallback(profile.pinCode)} />
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-blue-600">{icon}</div>
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-lg bg-blue-100 text-blue-600">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}