'use client';

import {
  BarChart3,
  Building2,
  ClipboardList,
  Layers,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { DemoRoleKey, SessionUser } from '@/types';

interface TopNavProps {
  user: SessionUser;
  activeTab: 'marketplace' | 'analytics';
  onTabChange: (tab: 'marketplace' | 'analytics') => void;
  onSwitchRole: (roleKey: DemoRoleKey) => Promise<void>;
  switchingRole: DemoRoleKey | null;
}

const ROLE_OPTIONS: Array<{
  key: DemoRoleKey;
  shortLabel: string;
  subLabel: string;
  isBuyer: boolean;
}> = [
  {
    key: 'buyer',
    shortLabel: '采购方 · 曹杰',
    subLabel: '集团战略采购部',
    isBuyer: true,
  },
  {
    key: 'supplier-a',
    shortLabel: '供应商A · 青岛海智',
    subLabel: 'AAA精密制造',
    isBuyer: false,
  },
  {
    key: 'supplier-b',
    shortLabel: '供应商B · 苏州云联',
    subLabel: 'AA工业科技',
    isBuyer: false,
  },
];

export function TopNav({
  user,
  activeTab,
  onTabChange,
  onSwitchRole,
  switchingRole,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  易采协同台
                </span>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  SupplyFlow
                </span>
              </div>
              <p className="text-xs text-slate-500">
                供应链询报价与多角色在线竞价协同平台
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onTabChange('marketplace')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === 'marketplace'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              招采大厅
            </button>
            <button
              type="button"
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              降本分析看板
            </button>
          </nav>
        </div>

        {/* Right: Real-time Demo Role Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span className="hidden sm:inline">实时视角切换:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {ROLE_OPTIONS.map((opt) => {
              const active = user.key === opt.key;
              const isLoading = switchingRole === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={Boolean(switchingRole)}
                  onClick={() => onSwitchRole(opt.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? opt.isBuyer
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  } disabled:opacity-60`}
                  title={`${opt.shortLabel} (${opt.subLabel})`}
                >
                  {opt.isBuyer ? (
                    <UserCheck className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  <span>{isLoading ? '切换中...' : opt.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Role Context Banner */}
      <div
        className={`border-t px-4 py-1.5 text-xs sm:px-6 ${
          user.role === 'BUYER'
            ? 'border-indigo-100 bg-indigo-50/70 text-indigo-800'
            : 'border-emerald-100 bg-emerald-50/70 text-emerald-800'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">当前身份：{user.name}</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium shadow-sm">
              {user.badge}
            </span>
          </div>
          <span className="text-[11px] opacity-85">
            {user.role === 'BUYER'
              ? '权限：发布询价单 · 查看全量明标比价 · 智能评标打分 · 一键定标'
              : '权限：查看公开招标需求 · 在线分项报价/更新报价 · 竞争对手暗标脱敏保护'}
          </span>
        </div>
      </div>
    </header>
  );
}
