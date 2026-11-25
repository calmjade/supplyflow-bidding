'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Phone,
  RefreshCw,
  Shield,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react';
import { formatCNY } from '@/lib/format';
import type { AnalyticsData } from '@/types';

interface AnalyticsDashboardProps {
  refreshSignal: number;
}

export function AnalyticsDashboard({ refreshSignal }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics', { cache: 'no-store' });
      if (!res.ok) throw new Error('加载降本分析数据失败');
      const payload = (await res.json()) as AnalyticsData;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, refreshSignal]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
        <p>{error || '暂无分析数据'}</p>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重新加载
        </button>
      </div>
    );
  }

  const { summary, categoryBreakdown, supplierLeaderboard } = data;
  const totalRfqs =
    summary.openRfqCount + summary.reviewingRfqCount + summary.awardedRfqCount;

  const kpiCards = [
    {
      label: '累计招采总预算',
      value: formatCNY(summary.totalBudget),
      sub: `共 ${totalRfqs} 个采购项目（含在招与已定标）`,
      icon: Wallet,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: '已定标采购总额',
      value: formatCNY(summary.awardedSpend),
      sub: `已完成定标 ${summary.awardedRfqCount} 项 · 对应预算 ${formatCNY(
        summary.awardedBudget
      )}`,
      icon: CheckCircle2,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: '累计降本节约额',
      value: formatCNY(summary.totalSavings),
      sub: `综合平均降本率 ${summary.savingsRate}%`,
      icon: TrendingDown,
      accent: 'bg-emerald-50 text-emerald-600',
      highlight: true,
    },
    {
      label: '合格供应商与报价活跃度',
      value: `${summary.activeSupplierCount} 家`,
      sub: `累计收到有效报价 ${summary.totalBidsCount} 份`,
      icon: Users,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  const maxCategoryBudget = Math.max(
    ...categoryBreakdown.map((c) => c.budgetLimit),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">采购降本与供应商绩效看板</h1>
          <p className="text-xs text-slate-500">
            实时聚合各品类招采预算执行、定标节约率及供应商履约与中标贡献
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新统计
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p
                    className={`tabular-nums mt-2 text-2xl font-bold tracking-tight ${
                      card.highlight ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline + Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">招采项目进度分布</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                label: '竞价中 (OPEN)',
                count: summary.openRfqCount,
                bar: 'bg-emerald-500',
                badge: 'bg-emerald-50 text-emerald-700',
              },
              {
                label: '评审中 (REVIEWING)',
                count: summary.reviewingRfqCount,
                bar: 'bg-amber-500',
                badge: 'bg-amber-50 text-amber-700',
              },
              {
                label: '已定标 (AWARDED)',
                count: summary.awardedRfqCount,
                bar: 'bg-indigo-600',
                badge: 'bg-indigo-50 text-indigo-700',
              },
            ].map((stage) => {
              const pct =
                totalRfqs > 0 ? Math.round((stage.count / totalRfqs) * 100) : 0;
              return (
                <div key={stage.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{stage.label}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${stage.badge}`}>
                      {stage.count} 项 ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${stage.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">定标节约表现</p>
            <p className="mt-1 leading-relaxed">
              当前已定标项目累计节约采购资金{' '}
              <span className="tabular-nums font-bold text-emerald-600">
                {formatCNY(summary.totalSavings)}
              </span>
              ，平均较预算上限压降{' '}
              <span className="tabular-nums font-bold text-emerald-600">
                {summary.savingsRate}%
              </span>
              。
            </p>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">各采购品类预算与支出分布</h2>
            <span className="text-xs text-slate-500">按预算规模降序排列</span>
          </div>

          <div className="space-y-4">
            {categoryBreakdown.map((cat) => {
              const budgetPct = Math.round((cat.budgetLimit / maxCategoryBudget) * 100);
              const spendPct =
                cat.budgetLimit > 0
                  ? Math.min(100, Math.round((cat.awardedSpend / cat.budgetLimit) * 100))
                  : 0;
              return (
                <div
                  key={cat.category}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {cat.category}
                      </span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
                        {cat.rfqCount} 项需求
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">
                        预算:{' '}
                        <strong className="tabular-nums text-slate-900">
                          {formatCNY(cat.budgetLimit)}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        已定标:{' '}
                        <strong className="tabular-nums text-indigo-700">
                          {cat.awardedSpend > 0 ? formatCNY(cat.awardedSpend) : '待定标'}
                        </strong>
                      </span>
                      {cat.savingsRate > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          节约 {cat.savingsRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="relative h-full rounded-full bg-indigo-200"
                      style={{ width: `${budgetPct}%` }}
                    >
                      {cat.awardedSpend > 0 && (
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{ width: `${spendPct}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Supplier Leaderboard */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              合格供应商履约与中标排行榜
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            含平台实时定标累计中标额与历史履约信用评分
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">排名 / 供应商名称</th>
                <th className="px-4 py-3">资质等级</th>
                <th className="px-4 py-3">主营优势品类</th>
                <th className="px-4 py-3">历史履约率</th>
                <th className="px-4 py-3">投中标 (胜率)</th>
                <th className="px-4 py-3">平均降本率</th>
                <th className="px-5 py-3 text-right">累计中标金额</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplierLeaderboard.map((sup, index) => (
                <tr key={sup.id} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? 'bg-amber-100 text-amber-800'
                            : index === 1
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{sup.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          {sup.contactName} · {sup.contactPhone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sup.grade === 'AAA'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {sup.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    {sup.categoryFocus}
                  </td>
                  <td className="tabular-nums px-4 py-3.5 font-semibold text-slate-800">
                    {sup.fulfillmentRate}%
                  </td>
                  <td className="tabular-nums px-4 py-3.5 text-xs text-slate-700">
                    {sup.bidCount} 投 / {sup.winCount} 中 ({sup.winRate}%)
                  </td>
                  <td className="tabular-nums px-4 py-3.5 font-semibold text-emerald-600">
                    {sup.avgSavingsRate > 0 ? `+${sup.avgSavingsRate}%` : '—'}
                  </td>
                  <td className="tabular-nums px-5 py-3.5 text-right font-bold text-slate-900">
                    {formatCNY(sup.totalAwardedAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
