import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, FileText } from 'lucide-react';
import FeeStructureTab from './FeeStructureTab';
import FeePaymentsTab from './FeePaymentsTab';

const FeesPage: React.FC = () => {
  const location = useLocation();
  
  // Determine active tab based on URL
  const getActiveTab = () => {
    if (location.pathname.includes('/fees/structure')) return 'structure';
    if (location.pathname.includes('/fees/payments')) return 'payments';
    return 'structure'; // default
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const tabs = [
    {
      id: 'structure',
      name: 'Fee Structure',
      icon: FileText,
      href: '/admin/fees/structure',
      description: 'Create and manage fee structures'
    },
    {
      id: 'payments',
      name: 'Fee Payments',
      icon: FileText,
      href: '/admin/fees/payments',
      description: 'Record and track fee payments'
    }
  ];

  return (
    <div className="space-y-6 relative flex flex-col h-full min-h-[calc(100vh-120px)]">
      {/* Non-sticky Header that scrolls away */}
      <div className="flex flex-col gap-6 pt-4 pb-2 -mt-4 bg-[#f8fafc] shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden mx-2 sm:mx-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-xl flex items-center justify-center shadow-sm">
                <CreditCard className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fees Management</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Manage fee structures and track payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation */}
      <div className="sticky top-[72px] z-[30] pt-2 pb-2 -mt-2 bg-[#f8fafc]">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl mx-2 sm:mx-0 overflow-x-auto custom-scrollbar border border-slate-200/60">
          <nav className="flex space-x-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    window.history.pushState({}, '', tab.href);
                  }}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 3 : 2} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-2 sm:mx-0">
        {activeTab === 'structure' && <FeeStructureTab />}
        {activeTab === 'payments' && <FeePaymentsTab />}
      </div>
    </div>
  );
};

export default FeesPage;
