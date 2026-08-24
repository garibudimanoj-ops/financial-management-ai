'use client';

import { useTransition } from 'react';
import { switchBusiness } from '@/actions/business';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface BusinessItem {
  businessId: string;
  name: string;
  role: string;
  baseCurrency: string;
  city: string;
  country: string;
}

interface BusinessSwitcherProps {
  currentBusinessId: string;
  businesses: BusinessItem[];
}

export default function BusinessSwitcher({ currentBusinessId, businesses }: BusinessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBusiness = businesses.find((b) => b.businessId === currentBusinessId) || businesses[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (businessId: string) => {
    setIsOpen(false);
    if (businessId === currentBusinessId) return;

    startTransition(async () => {
      await switchBusiness(businessId);
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all max-w-[260px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {currentBusiness ? currentBusiness.name : 'Select Business'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {currentBusiness ? `${currentBusiness.role} • ${currentBusiness.baseCurrency}` : 'No active workspace'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl bg-[#12141f] border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Workspaces</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 py-1">
            {businesses.map((biz) => {
              const isSelected = biz.businessId === currentBusinessId;
              return (
                <button
                  key={biz.businessId}
                  type="button"
                  onClick={() => handleSelect(biz.businessId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 text-white font-medium border border-indigo-500/30'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-medium">{biz.name}</p>
                    <span className="text-xs text-gray-400">
                      {biz.role} • {biz.city}, {biz.country}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/10 mt-1">
            <Link
              href="/onboarding"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-600/10 hover:text-indigo-300 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Business</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
