import { useEffect, useState } from "react";
import {
  School,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Contact as ContactIcon,
} from "lucide-react";
import api from "../../../services/api";

interface SchoolAddress {
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  taluka?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  pinCode?: string;
}

interface SchoolContactInfo {
  schoolName: string;
  schoolCode?: string;
  logoUrl?: string;
  principalName: string;
  principalEmail: string;
  principalContact: string;
  schoolEmail?: string;
  schoolPhone?: string;
  website?: string;
  address?: SchoolAddress;
}

export default function ContactInfo() {
  const [info, setInfo] = useState<SchoolContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setLoading(true);
        setError("");

        // Backend returns { success, data: <school contact info> }
        const response = await api.get("/schools/contact-info");

        setInfo(response.data?.data ?? null);
      } catch (err) {
        setError("Unable to load contact information");
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  const fallback = (value: string | null | undefined) => value || "--";

  const formatAddress = (address?: SchoolAddress) => {
    if (!address) return "--";
    const line = [
      address.street,
      address.area,
      address.city,
      address.district,
      address.taluka,
      address.state,
      address.zipCode || address.pinCode,
      address.country,
    ]
      .filter(Boolean)
      .join(", ");
    return line || "--";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        Loading contact information...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!info) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12">
        <div className="flex flex-col items-center text-gray-500">
          <ContactIcon size={48} className="mb-4 text-gray-300" />
          <h3 className="text-lg font-medium">Contact information not available</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Contact Info
            </h1>

            <p className="mt-1.5 text-sm text-gray-500">
              School and principal contact details for reference.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}

      <div className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

        <div className="flex items-center gap-6">

          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {info.logoUrl ? (
              <img
                src={info.logoUrl}
                alt={fallback(info.schoolName)}
                className="w-full h-full object-cover"
              />
            ) : (
              <School size={36} className="text-blue-600" />
            )}
          </div>

          <div>

            <h2 className="text-2xl font-bold">
              {fallback(info.schoolName)}
            </h2>

            {info.schoolCode && (
              <p className="text-sm text-gray-500 mt-1.5">
                School Code : {info.schoolCode}
              </p>
            )}

            <p className="text-sm text-gray-500">
              {formatAddress(info.address)}
            </p>

          </div>

        </div>

      </div>

      {/* Principal Information */}

      <SectionTitle icon={<User />} title="Principal Information" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">

        <Info icon={<User size={18} />} label="Principal Name" value={fallback(info.principalName)} />
        <Info icon={<Phone size={18} />} label="Principal Contact" value={fallback(info.principalContact)} />
        <Info icon={<Mail size={18} />} label="Principal Email" value={fallback(info.principalEmail)} />

      </div>

      {/* School Office Information */}

      <SectionTitle icon={<School />} title="School Office" />

      <div className="bg-white rounded-xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">

        <Info icon={<Phone size={18} />} label="School Phone" value={fallback(info.schoolPhone)} />
        <Info icon={<Mail size={18} />} label="School Email" value={fallback(info.schoolEmail)} />
        <Info icon={<Globe size={18} />} label="Website" value={fallback(info.website)} />
        <Info icon={<MapPin size={18} />} label="Address" value={formatAddress(info.address)} />

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

      <h2 className="text-xl font-semibold">
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

      <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
        {icon}
      </div>

      <div>

        <p className="text-sm text-gray-500">
          {label}
        </p>

        <p className="text-base font-semibold text-gray-900">
          {value}
        </p>

      </div>

    </div>
  );
}