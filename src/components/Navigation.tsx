import React from 'react';
import { Map, BookOpen, Users, SlidersHorizontal } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  notificationBadgeCount?: number;
}

interface NavTabItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  notificationBadgeCount = 18
}) => {
  const tabs: NavTabItem[] = [
    { id: 'map', label: 'MAPPA', icon: Map },
    { id: 'diary', label: 'DIARIO', icon: BookOpen },
    { id: 'social', label: 'SOCIAL', icon: Users },
    { id: 'tools', label: 'STRUMENTI', icon: SlidersHorizontal, badge: notificationBadgeCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-300/80 dark:border-slate-800 transition-colors">
      <div className="max-w-md mx-auto px-6 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 transition-colors rounded-xl ${
                isActive
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-emerald-950 dark:text-emerald-100 font-extrabold shadow-sm border border-amber-200 dark:border-amber-700'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border border-white dark:border-slate-900 leading-none">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] tracking-wider uppercase font-semibold">
                {tab.label}
              </span>

              {isActive && (
                <div className="absolute -bottom-2 w-8 h-1 bg-emerald-800 dark:bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
