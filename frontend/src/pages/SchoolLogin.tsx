import React, { useState } from 'react';
import { School, User, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../api/axios';

interface LoginFormData {
  identifier: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    schoolId: string;
    schoolName: string;
  };
}

interface SchoolLoginProps {
  role?: "teacher" | "student";
  schoolCode?: string;
  onLoginSuccess?: (userInfo: any) => void;
  onBack?: () => void;
}

export function SchoolLogin({ role = "teacher", schoolCode = "", onLoginSuccess, onBack }: SchoolLoginProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.identifier || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let loginPayload: any;
      if (role === "student") {
          loginPayload = {
              identifier: formData.identifier,
              password: formData.password.replace(/\D/g, ""),
              schoolCode
          };
          const response = await api.post(
              "/auth/school-login",
              loginPayload
          );
          const data: LoginResponse = response.data;
          if (data.success) {
              localStorage.setItem("authToken", data.token);
              localStorage.setItem("userInfo", JSON.stringify(data.user));
              if (onLoginSuccess) {
                  onLoginSuccess(data.user);
              }
          }

      } else {
          const response = await api.post("/auth/login", {
              email: formData.identifier,
              password: formData.password
          });
          const data: LoginResponse = response.data;
          if (data.success) {
              localStorage.setItem("authToken", data.token);
              localStorage.setItem("userInfo", JSON.stringify(data.user));
              if (onLoginSuccess) {
                  onLoginSuccess(data.user);
              }
          }

      }

    } catch (error: any) {
      console.error('Login error:', error);
      setError(
        error.response?.data?.message || 
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          )}
          
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <School className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {role === "student"
                ? "Students & Parents Login"
                : "School Portal Login"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {role === "student"
                ? "Sign in using Student ID and Date of Birth"
                : "Sign in to access your school account"}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <div>
              <label>
                {role === "student"
                    ? "Student ID"
                    : "Email Address"}
            </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.identifier}
                  onChange={(e)=>
                  handleInputChange("identifier",e.target.value)
                  }
                  placeholder={
                      role==="student"
                          ? "Enter Student ID"
                          : "Enter your email"
                  }
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {role==="student"
                    ? "Date of Birth"
                    : "Password"}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onFocus={() => setShowPassword(true)}
                  onBlur={() => setShowPassword(false)}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={
                    role==="student"
                        ? "DD/MM/YYYY"
                        : "Enter your password"
                }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Having trouble logging in?{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              Contact your school administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
