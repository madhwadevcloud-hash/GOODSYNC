import { useEffect, useState } from "react";
import {
  User,
  GraduationCap,
  Users,
  MapPin,
  CalendarDays,
  Phone,
  Mail,
  Droplets,
  Globe,
  Bus,
  Hash,
} from "lucide-react";
import api from "../../../services/api";

interface StudentProfile {
  studentName: string | null;
  studentId: string | null;
  enrollmentNo: string | null;
  class: string | null;
  section: string | null;
  rollNumber: string | null;
  academicYear: string | null;

  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  nationality: string | null;

  email: string | null;
  mobile: string | null;

  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  parentMobile: string | null;

  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;

  admissionDate: string | null;

  transport: string | null;
  busRoute: string | null;

  profileImage?: string | null;
}

export default function Profile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        // Backend returns { success, data: <flattened student profile> }
        const response = await api.get("/users/my-profile");

        setProfile(response.data?.data ?? null);
      } catch (err) {
        setError("Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

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
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          <p className="text-sm font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
        {error}
      </div>
    );
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
    <div className="space-y-10">

      {/* Header */}

      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-6 sm:px-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Profile
        </h1>

        <p className="mt-1.5 text-sm text-gray-500">
          View your personal, academic, and contact information.
        </p>
      </div>

      {/* Summary Card */}

      <div className="bg-white rounded-xl border shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">

        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">

          <div className="h-24 w-24 shrink-0 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden ring-4 ring-blue-50">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={fallback(profile.studentName)}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={42} className="text-blue-600" />
            )}
          </div>

          <div className="min-w-0">

            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
              {fallback(profile.studentName)}
            </h2>

            <p className="mt-1.5 text-sm text-gray-500">
              Student ID <span className="text-gray-400">·</span> {fallback(profile.studentId)}
            </p>

            <p className="mt-0.5 text-sm text-gray-500">
              Class {fallback(profile.class)}-{fallback(profile.section)}
              <span className="mx-1.5 text-gray-300">|</span>
              Roll No. {fallback(profile.rollNumber)}
            </p>

          </div>

        </div>

      </div>

      {/* Personal Information */}

      <section className="space-y-4">
        <SectionTitle icon={<User size={20} />} title="Personal Information" />

        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 transition-shadow duration-300 hover:shadow-md">
          <Info icon={<CalendarDays size={18} />} label="Date of Birth" value={formatDate(profile.dob)} />
          <Info icon={<User size={18} />} label="Gender" value={fallback(profile.gender)} />
          <Info icon={<Droplets size={18} />} label="Blood Group" value={fallback(profile.bloodGroup)} />
          <Info icon={<Globe size={18} />} label="Nationality" value={fallback(profile.nationality)} />
          <Info icon={<Mail size={18} />} label="Email" value={fallback(profile.email)} />
          <Info icon={<Phone size={18} />} label="Mobile" value={fallback(profile.mobile)} />
        </div>
      </section>

      {/* Academic Information */}

      <section className="space-y-4">
        <SectionTitle icon={<GraduationCap size={20} />} title="Academic Information" />

        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 transition-shadow duration-300 hover:shadow-md">
          <Info icon={<Hash size={18} />} label="Enrollment No" value={fallback(profile.enrollmentNo)} />
          <Info icon={<GraduationCap size={18} />} label="Academic Year" value={fallback(profile.academicYear)} />
          <Info icon={<GraduationCap size={18} />} label="Class" value={`${fallback(profile.class)}-${fallback(profile.section)}`} />
          <Info icon={<Hash size={18} />} label="Roll Number" value={fallback(profile.rollNumber)} />
          <Info icon={<CalendarDays size={18} />} label="Admission Date" value={formatDate(profile.admissionDate)} />
        </div>
      </section>

      {/* Parent Information */}

      <section className="space-y-4">
        <SectionTitle icon={<Users size={20} />} title="Parent Information" />

        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 transition-shadow duration-300 hover:shadow-md">
          <Info icon={<Users size={18} />} label="Father Name" value={fallback(profile.fatherName)} />
          <Info icon={<Users size={18} />} label="Mother Name" value={fallback(profile.motherName)} />
          <Info icon={<Users size={18} />} label="Guardian" value={fallback(profile.guardianName)} />
          <Info icon={<Phone size={18} />} label="Parent Contact" value={fallback(profile.parentMobile)} />
        </div>
      </section>

      {/* Address */}

      <section className="space-y-4">
        <SectionTitle icon={<MapPin size={20} />} title="Address & Transport" />

        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 transition-shadow duration-300 hover:shadow-md">
          <Info icon={<MapPin size={18} />} label="Address" value={fallback(profile.address)} />
          <Info icon={<MapPin size={18} />} label="City" value={fallback(profile.city)} />
          <Info icon={<MapPin size={18} />} label="State" value={fallback(profile.state)} />
          <Info icon={<MapPin size={18} />} label="Pin Code" value={fallback(profile.pinCode)} />
          <Info icon={<Bus size={18} />} label="Transport" value={fallback(profile.transport)} />
          <Info icon={<Bus size={18} />} label="Bus Route" value={fallback(profile.busRoute)} />
        </div>
      </section>

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
    <div className="flex items-center gap-2.5 px-1">
      <div className="text-blue-600">
        {icon}
      </div>

      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
        {title}
      </h2>
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
    <div className="flex items-start gap-3.5">

      <div className="shrink-0 p-2.5 rounded-lg bg-blue-100 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 text-sm sm:text-base font-medium text-gray-900 break-words leading-snug">
          {value}
        </p>

      </div>

    </div>
  );
}