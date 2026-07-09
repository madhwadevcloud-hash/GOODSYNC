import { useEffect, useState } from "react";
import {
  MessageCircle,
  CalendarDays,
  Clock,
} from "lucide-react";
import api from "../../../services/api";

interface Message {
  id: string;
  title: string;
  subject: string;
  content: string;
  class: string;
  section: string;
  sender: string;
  senderName?: string;
  senderRole?: string;
  createdAt: string;
  messageAge: string;
  isRead: boolean;
}

export default function Message() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError("");

        // Backend returns { success, data: Message[], pagination }
        const response = await api.get("/messages/student");

        setMessages(response.data?.data ?? []);
      } catch (err) {
        setError("Unable to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          <p className="text-sm font-medium">Loading Messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">

      <div>
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white px-8 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Messages
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Stay updated with announcements and messages from your school.
              </p>
            </div>
          </div>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12">

          <div className="flex flex-col items-center text-gray-500">

            <MessageCircle
              size={48}
              className="mb-4 text-gray-300"
            />

            <h3 className="text-lg font-medium">
              No messages available
            </h3>

            <p className="mt-2 text-sm">
              School announcements will appear here.
            </p>

          </div>

        </div>
      ) : (
        <div className="space-y-6">

          {messages.map((message) => (

            <div
              key={message.id}
              className="bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >

              <div className="flex justify-between items-start">

                <div className="space-y-4 flex-1">

                  <div className="flex items-center gap-3 flex-wrap">

                    <MessageCircle className="text-blue-600" />

                    <h2 className="text-xl font-semibold">
                      {message.title}
                    </h2>

                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        message.senderRole === 'teacher'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {message.senderRole === 'teacher' ? '🧑‍🏫' : '🛡️'} From {message.senderName || message.sender}
                    </span>

                  </div>

                  <div className="flex gap-3 flex-wrap">

                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {message.subject}
                    </span>

                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      Class {message.class}-{message.section}
                    </span>

                  </div>

                  <p className="text-gray-600 leading-7">
                    {message.content}
                  </p>

                  <div className="flex gap-8 flex-wrap text-gray-500 text-sm">

                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      {new Date(message.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      {message.messageAge}
                    </div>

                  </div>

                </div>

                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    message.isRead
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {message.isRead ? "Read" : "New"}
                </span>

              </div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
}