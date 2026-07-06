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

      {/* Header */}

      <div>
        <h1 className="text-4xl font-bold text-gray-900">
          My Profile
        </h1>

        <p className="text-gray-500 mt-2">
          View your personal and academic information.
        </p>
      </div>

      {/* Summary Card */}

      <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

        <div className="flex items-center gap-6">

          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={fallback(profile.studentName)}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={46} className="text-blue-600" />
            )}
          </div>

          <div>

            <h2 className="text-3xl font-bold">
              {fallback(profile.studentName)}
            </h2>

            <p className="text-gray-500 mt-2">
              Student ID : {fallback(profile.studentId)}
            </p>

            <p className="text-gray-500">
              Class {fallback(profile.class)}-{fallback(profile.section)}
            </p>

            <p className="text-gray-500">
              Roll Number : {fallback(profile.rollNumber)}
            </p>

          </div>

        </div>

      </div>

      {/* Personal Information */}

      <SectionTitle icon={<User />} title="Personal Information" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">

        <Info icon={<CalendarDays size={18} />} label="Date of Birth" value={formatDate(profile.dob)} />
        <Info icon={<User size={18} />} label="Gender" value={fallback(profile.gender)} />
        <Info icon={<Droplets size={18} />} label="Blood Group" value={fallback(profile.bloodGroup)} />
        <Info icon={<Globe size={18} />} label="Nationality" value={fallback(profile.nationality)} />
        <Info icon={<Mail size={18} />} label="Email" value={fallback(profile.email)} />
        <Info icon={<Phone size={18} />} label="Mobile" value={fallback(profile.mobile)} />

      </div>

      {/* Academic Information */}

      <SectionTitle
        icon={<GraduationCap />}
        title="Academic Information"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">

        <Info icon={<Hash size={18} />} label="Enrollment No" value={fallback(profile.enrollmentNo)} />
        <Info icon={<GraduationCap size={18} />} label="Academic Year" value={fallback(profile.academicYear)} />
        <Info icon={<GraduationCap size={18} />} label="Class" value={`${fallback(profile.class)}-${fallback(profile.section)}`} />
        <Info icon={<Hash size={18} />} label="Roll Number" value={fallback(profile.rollNumber)} />
        <Info icon={<CalendarDays size={18} />} label="Admission Date" value={formatDate(profile.admissionDate)} />

      </div>

      {/* Parent Information */}

      <SectionTitle
        icon={<Users />}
        title="Parent Information"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">

        <Info icon={<Users size={18} />} label="Father Name" value={fallback(profile.fatherName)} />
        <Info icon={<Users size={18} />} label="Mother Name" value={fallback(profile.motherName)} />
        <Info icon={<Users size={18} />} label="Guardian" value={fallback(profile.guardianName)} />
        <Info icon={<Phone size={18} />} label="Parent Contact" value={fallback(profile.parentMobile)} />

      </div>

      {/* Address */}

      <SectionTitle
        icon={<MapPin />}
        title="Address & Transport"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">

        <Info icon={<MapPin size={18} />} label="Address" value={fallback(profile.address)} />
        <Info icon={<MapPin size={18} />} label="City" value={fallback(profile.city)} />
        <Info icon={<MapPin size={18} />} label="State" value={fallback(profile.state)} />
        <Info icon={<MapPin size={18} />} label="Pin Code" value={fallback(profile.pinCode)} />
        <Info icon={<Bus size={18} />} label="Transport" value={fallback(profile.transport)} />
        <Info icon={<Bus size={18} />} label="Bus Route" value={fallback(profile.busRoute)} />

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
      <div className="text-blue-600">
        {icon}
      </div>

      <h2 className="text-2xl font-semibold">
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
    <div className="flex items-start gap-4">

      <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
        {icon}
      </div>

      <div>

        <p className="text-sm text-gray-500">
          {label}
        </p>

        <p className="text-lg font-semibold text-gray-900">
          {value}
        </p>

      </div>

    </div>
  );
}