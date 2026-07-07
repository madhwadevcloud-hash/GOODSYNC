import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../auth/AuthContext";

interface Message {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead?: boolean;
}

interface StudentProfile {
  grade?: string;
  section?: string;
  class?: string;
  currentClass?: string;
  currentSection?: string;
}

export default function Topbar() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<StudentProfile>({});

  const [messages, setMessages] = useState<Message[]>([]);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const notificationRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTopbar();

    const interval = setInterval(() => {
      fetchMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const loadTopbar = async () => {
    await Promise.all([
      fetchProfile(),
      fetchMessages(),
    ]);
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get(
        "/users/my-profile"
      );

      setProfile(
        res.data?.data ?? {}
      );
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(
        "/messages/student",
        {
          params: {
            limit: 5,
          },
        }
      );

      setMessages(
        res.data?.data ?? []
      );
    } catch (err) {
      console.error(err);
    }
  };

  const studentClass =
    profile.grade ||
    profile.class ||
    profile.currentClass ||
    "";

  const studentSection =
    profile.section ||
    profile.currentSection ||
    "";

  const classSection =
    studentClass || studentSection
      ? `Grade ${studentClass} • Section ${studentSection}`
      : "Student";

  // Until backend unread tracking is implemented
  const notificationCount =
    messages.length;

  return (
    <div className="h-20 bg-white border-b px-8 flex items-center justify-between">

      {/* Left */}

      <div>

        <h1 className="text-3xl font-bold text-gray-900">

          Welcome back,

          {" "}

          {user?.name ?? "Student"}

          👋

        </h1>

        <p className="text-gray-500 mt-1">

          {classSection !== "Student" ? classSection : "Here's your academic overview."}

        </p>

      </div>

      {/* Right */}

      <div className="flex items-center gap-8">

        {/* Notifications */}

        <div
          ref={notificationRef}
          className="relative"
        >

          <button
            onClick={() =>
              setShowNotifications(
                !showNotifications
              )
            }
            className="relative"
          >

            <Bell
              size={23}
              className="cursor-pointer text-gray-600 hover:text-blue-600 transition"
            />

            {notificationCount > 0 && (

              <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-semibold">

                {notificationCount}

              </span>

            )}

          </button>

          {showNotifications && (

            <div className="absolute right-0 mt-3 w-80 rounded-xl border bg-white shadow-xl z-50">

              <div className="px-4 py-3 border-b font-semibold">

                Notifications

              </div>

              {messages.length === 0 ? (

                <div className="p-4 text-gray-500">

                  No notifications

                </div>

              ) : (

                messages.map((msg) => (

                  <div
                    key={msg._id}
                    className="px-4 py-3 border-b last:border-none hover:bg-gray-50 transition"
                  >

                    <h4 className="font-semibold">

                      {msg.title}

                    </h4>

                    <p className="text-sm text-gray-500 mt-1">

                      {msg.message}

                    </p>

                    <p className="text-xs text-gray-400 mt-2">

                      {new Date(
                        msg.createdAt
                      ).toLocaleString()}

                    </p>

                  </div>

                ))

              )}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}