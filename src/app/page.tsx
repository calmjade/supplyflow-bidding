'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { CreateRfqModal } from '@/components/CreateRfqModal';
import { RfqDetailModal } from '@/components/RfqDetailModal';
import { RfqMarketplace } from '@/components/RfqMarketplace';
import { TopNav } from '@/components/TopNav';
import { API_BASE } from '@/lib/format';
import type { DemoRoleKey, RfqProject, SessionUser } from '@/types';

const FALLBACK_USER: SessionUser = {
  key: 'buyer',
  id: 'buyer-caojie',
  name: '曹杰 · 集团战略采购部',
  role: 'BUYER',
  company: '集团战略采购部',
  badge: '采购总监 · 招采主持',
};

export default function HomePage() {
  const [user, setUser] = useState<SessionUser>(FALLBACK_USER);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'analytics'>('marketplace');
  const [switchingRole, setSwitchingRole] = useState<DemoRoleKey | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { user?: SessionUser };
        if (active && data.user) {
          setUser(data.user);
        }
      } catch {
        // Keep default fallback session
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSwitchRole = async (roleKey: DemoRoleKey) => {
    if (roleKey === user.key) return;
    setSwitchingRole(roleKey);
    try {
      const res = await fetch(`${API_BASE}/auth/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleKey }),
      });
      const data = (await res.json()) as { user?: SessionUser; error?: string };
      if (!res.ok || !data.user) {
        showToast(data.error || '角色切换失败');
        return;
      }
      setUser(data.user);
      setRefreshSignal((s) => s + 1);
      showToast(`已切换工作台视角：${data.user.name}（${data.user.badge}）`);
    } catch {
      showToast('网络异常，无法切换角色');
    } finally {
      setSwitchingRole(null);
    }
  };

  const handleRfqCreated = (rfq: RfqProject) => {
    setCreateModalOpen(false);
    setRefreshSignal((s) => s + 1);
    setSelectedRfqId(rfq.id);
    showToast(`已发布新询价单 ${rfq.id}：${rfq.title}`);
  };

  const handleMutated = (message: string) => {
    setRefreshSignal((s) => s + 1);
    showToast(message);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopNav
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSwitchRole={handleSwitchRole}
        switchingRole={switchingRole}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-md items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-slate-800 shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭提示"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'marketplace' ? (
          <RfqMarketplace
            user={user}
            refreshSignal={refreshSignal}
            onOpenCreate={() => setCreateModalOpen(true)}
            onSelectRfq={(id) => setSelectedRfqId(id)}
          />
        ) : (
          <AnalyticsDashboard refreshSignal={refreshSignal} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        易采协同台 · SupplyFlow Bidding — 供应链询报价与多角色在线竞价协同平台 · Copyright © 2026{' '}
        <span className="font-medium text-slate-700">Cao Jie (calmjade)</span>
      </footer>

      <CreateRfqModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleRfqCreated}
      />

      <RfqDetailModal
        rfqId={selectedRfqId}
        user={user}
        onClose={() => setSelectedRfqId(null)}
        onMutated={handleMutated}
      />
    </div>
  );
}
