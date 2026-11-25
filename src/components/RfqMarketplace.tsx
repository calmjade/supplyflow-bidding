'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Gavel,
  Package,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import {
  CATEGORIES,
  STATUS_META,
  formatCNY,
  getDeadlineBadge,
} from '@/lib/format';
import type { RfqProject, RfqStatus, SessionUser } from '@/types';

interface RfqMarketplaceProps {
  user: SessionUser;
  refreshSignal: number;
  onOpenCreate: () => void;
  onSelectRfq: (rfqId: string) => void;
}

const STATUS_TABS: Array<{ value: 'ALL' | RfqStatus; label: string }> = [
  { value: 'ALL', label: '全部询价单' },
  { value: 'OPEN', label: '竞价中' },
  { value: 'REVIEWING', label: '评审中' },
  { value: 'AWARDED', label: '已定标' },
];

export function RfqMarketplace({
  user,
  refreshSignal,
  onOpenCreate,
  onSelectRfq,
}: RfqMarketplaceProps) {
  const [rfqs, setRfqs] = useState<RfqProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | RfqStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRfqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (searchTerm.trim()) params.set('q', searchTerm.trim());

      const qs = params.toString();
      const res = await fetch(`/api/rfqs${qs ? `?${qs}` : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('加载招采需求列表失败');
      const data = (await res.json()) as { rfqs: RfqProject[] };
      setRfqs(data.rfqs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    void fetchRfqs();
  }, [fetchRfqs, refreshSignal, user.key]);

  const metrics = useMemo(() => {
    const openCount = rfqs.filter((r) => r.status === 'OPEN').length;
    const reviewingCount = rfqs.filter((r) => r.status === 'REVIEWING').length;
    const awardedCount = rfqs.filter((r) => r.status === 'AWARDED').length;
    const totalBudget = rfqs.reduce((sum, r) => sum + r.budgetLimit, 0);
    const myBidCount = rfqs.filter((r) => r.hasMyBid).length;
    return { openCount, reviewingCount, awardedCount, totalBudget, myBidCount };
  }, [rfqs]);

  return (
    <div className="space-y-6">
      {/* Hero / Role Action Banner */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              {user.role === 'BUYER'
                ? '集团招采指挥中心 · 暗标比价与智能评标'
                : '合格供应商门户 · 在线分项竞价与暗标保护'}
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {user.role === 'BUYER'
                ? '统一发布寻源需求，透明比价与一键定标'
                : `欢迎，${user.company} — 参与实时在线竞价`}
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              {user.role === 'BUYER'
                ? '系统自动汇总供应商分项报价并按「价格 55% · 交期 20% · 质保 15% · 履约 10%」生成综合评分，辅助采购团队高效决策降本。'
                : '在「竞价中」状态的询价单内提交分项单价与交期承诺；竞价期内竞争对手报价严格脱敏保护，保障公平透明竞争。'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur">
                <p className="text-[11px] text-slate-300">竞价中</p>
                <p className="tabular-nums mt-0.5 text-lg font-bold text-emerald-400">
                  {metrics.openCount}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur">
                <p className="text-[11px] text-slate-300">评审中</p>
                <p className="tabular-nums mt-0.5 text-lg font-bold text-amber-300">
                  {metrics.reviewingCount}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur">
                <p className="text-[11px] text-slate-300">
                  {user.role === 'SUPPLIER' ? '我已报价' : '已定标'}
                </p>
                <p className="tabular-nums mt-0.5 text-lg font-bold text-indigo-300">
                  {user.role === 'SUPPLIER' ? metrics.myBidCount : metrics.awardedCount}
                </p>
              </div>
            </div>

            {user.role === 'BUYER' && (
              <button
                type="button"
                onClick={onOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
              >
                <Plus className="h-4 w-4" />
                发布新询价单
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters Toolbar */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索编号、标题或物料说明..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">全部采购品类</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* RFQ List Grid */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && rfqs.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
      ) : rfqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">未找到匹配的询价单</p>
          <p className="mt-1 text-xs text-slate-500">
            尝试调整状态筛选、品类或搜索关键词
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rfqs.map((rfq) => {
            const meta = STATUS_META[rfq.status];
            const lowestSavings =
              rfq.lowestBidPrice != null && rfq.budgetLimit > 0
                ? (((rfq.budgetLimit - rfq.lowestBidPrice) / rfq.budgetLimit) * 100).toFixed(1)
                : null;

            return (
              <article
                key={rfq.id}
                onClick={() => onSelectRfq(rfq.id)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div>
                  {/* Card Top Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                        {rfq.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        {meta.label}
                      </span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                        {rfq.category}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      {getDeadlineBadge(rfq.deadline, rfq.status)}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h2 className="mt-3 text-base font-bold text-slate-900 transition group-hover:text-indigo-700">
                    {rfq.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {rfq.description}
                  </p>

                  {/* Line items chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rfq.items.slice(0, 3).map((item) => (
                      <span
                        key={item.sku}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                      >
                        <Package className="h-3 w-3 text-slate-400" />
                        {item.name} × {item.qty}
                        {item.unit}
                      </span>
                    ))}
                    {rfq.items.length > 3 && (
                      <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                        +{rfq.items.length - 3} 项
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Metrics */}
                <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3.5">
                  <div className="flex flex-wrap items-center gap-5">
                    <div>
                      <p className="text-[11px] text-slate-400">预算上限</p>
                      <p className="tabular-nums text-sm font-bold text-slate-900">
                        {formatCNY(rfq.budgetLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">已收报价</p>
                      <p className="tabular-nums text-sm font-bold text-slate-800">
                        {rfq.bidCount ?? 0} 家
                      </p>
                    </div>

                    {user.role === 'SUPPLIER' ? (
                      <div>
                        <p className="text-[11px] text-slate-400">我的报价</p>
                        {rfq.hasMyBid ? (
                          <p className="tabular-nums inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {formatCNY(rfq.myBidPrice)}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-amber-600">尚未报价</p>
                        )}
                      </div>
                    ) : (
                      rfq.lowestBidPrice != null && (
                        <div>
                          <p className="text-[11px] text-slate-400">最低报价</p>
                          <p className="tabular-nums inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {formatCNY(rfq.lowestBidPrice)}
                            {lowestSavings && (
                              <span className="text-[11px] font-semibold">
                                (-{lowestSavings}%)
                              </span>
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <Gavel className="h-3.5 w-3.5" />
                    {user.role === 'BUYER'
                      ? rfq.status === 'AWARDED'
                        ? '查看定标结果'
                        : '开标评标'
                      : rfq.status === 'OPEN'
                        ? rfq.hasMyBid
                          ? '调整报价'
                          : '立即竞价'
                        : '查看详情'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
