'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Package,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  API_BASE,
  STATUS_META,
  formatCNY,
  formatCNYExact,
  formatDateTime,
  getDeadlineBadge,
} from '@/lib/format';
import type { RfqProject, SessionUser, SupplierBidView } from '@/types';

interface RfqDetailModalProps {
  rfqId: string | null;
  user: SessionUser;
  onClose: () => void;
  onMutated: (message: string) => void;
}

interface RfqDetailResponse {
  rfq: RfqProject;
  bids: SupplierBidView[];
  user: SessionUser;
}

export function RfqDetailModal({
  rfqId,
  user,
  onClose,
  onMutated,
}: RfqDetailModalProps) {
  const [detail, setDetail] = useState<RfqDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supplier bidding form state
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [leadDays, setLeadDays] = useState('20');
  const [warrantyMonths, setWarrantyMonths] = useState('24');
  const [proposalNote, setProposalNote] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  // Buyer award confirmation state
  const [confirmAwardBidId, setConfirmAwardBidId] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!rfqId) return;
    setLoading(true);
    setError(null);
    setConfirmAwardBidId(null);
    setAwardError(null);
    setBidError(null);
    try {
      const res = await fetch(`${API_BASE}/rfqs/${encodeURIComponent(rfqId)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as RfqDetailResponse & { error?: string };
      if (!res.ok || !data.rfq) {
        throw new Error(data.error || '加载询价详情失败');
      }
      setDetail(data);

      // Initialize supplier bid form from existing own bid or reference prices
      const ownBid = data.bids.find((b) => b.isOwn);
      const initialPrices: Record<string, string> = {};
      for (const item of data.rfq.items) {
        const matched = ownBid?.itemPrices.find((p) => p.sku === item.sku);
        initialPrices[item.sku] = String(
          matched ? matched.unitPrice : Math.round(item.refUnitPrice * 0.94)
        );
      }
      setUnitPrices(initialPrices);
      setLeadDays(String(ownBid?.leadDays ?? 20));
      setWarrantyMonths(String(ownBid?.warrantyMonths ?? 24));
      setProposalNote(
        ownBid?.proposalNote ??
          '严格按照技术规格供货，含现场安装调试及全周期售后服务响应。'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载详情异常');
    } finally {
      setLoading(false);
    }
  }, [rfqId, user.key]);

  useEffect(() => {
    if (rfqId) {
      void loadDetail();
    } else {
      setDetail(null);
    }
  }, [rfqId, loadDetail]);

  const rfq = detail?.rfq ?? null;
  const bids = detail?.bids ?? [];
  const ownBid = useMemo(() => bids.find((b) => b.isOwn) ?? null, [bids]);

  const liveBidTotal = useMemo(() => {
    if (!rfq) return 0;
    return rfq.items.reduce((sum, item) => {
      const price = Number(unitPrices[item.sku]) || 0;
      return sum + price * item.qty;
    }, 0);
  }, [rfq, unitPrices]);

  const liveSavingsRate = useMemo(() => {
    if (!rfq || rfq.budgetLimit <= 0) return 0;
    return ((rfq.budgetLimit - liveBidTotal) / rfq.budgetLimit) * 100;
  }, [rfq, liveBidTotal]);

  if (!rfqId) return null;

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfq) return;
    setBidError(null);

    const itemPrices = rfq.items.map((item) => ({
      sku: item.sku,
      unitPrice: Number(unitPrices[item.sku]),
    }));

    if (itemPrices.some((p) => !Number.isFinite(p.unitPrice) || p.unitPrice <= 0)) {
      setBidError('请为每一项物料填写大于 0 的有效单价');
      return;
    }

    const parsedLead = Number(leadDays);
    const parsedWarranty = Number(warrantyMonths);
    if (!Number.isFinite(parsedLead) || parsedLead <= 0) {
      setBidError('交付周期必须大于 0 天');
      return;
    }
    if (!Number.isFinite(parsedWarranty) || parsedWarranty <= 0) {
      setBidError('质保期必须大于 0 个月');
      return;
    }

    setSubmittingBid(true);
    try {
      const res = await fetch(`${API_BASE}/rfqs/${encodeURIComponent(rfq.id)}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemPrices,
          leadDays: parsedLead,
          warrantyMonths: parsedWarranty,
          proposalNote: proposalNote.trim(),
        }),
      });
      const data = (await res.json()) as {
        bid?: { updated?: boolean; totalPrice?: number };
        error?: string;
      };
      if (!res.ok) {
        setBidError(data.error || '提交报价失败');
        return;
      }

      await loadDetail();
      onMutated(
        data.bid?.updated
          ? `已更新 ${rfq.id} 报价（总价 ${formatCNY(data.bid.totalPrice)}）`
          : `已成功提交 ${rfq.id} 竞价报价（总价 ${formatCNY(data.bid?.totalPrice)}）`
      );
    } catch {
      setBidError('网络异常，提交报价失败');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleAwardBid = async (bid: SupplierBidView) => {
    if (!rfq) return;
    setAwarding(true);
    setAwardError(null);
    try {
      const res = await fetch(`${API_BASE}/rfqs/${encodeURIComponent(rfq.id)}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId: bid.id }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        winnerSupplier?: string;
        awardedPrice?: number;
        error?: string;
      };
      if (!res.ok) {
        setAwardError(data.error || '定标操作失败');
        return;
      }
      setConfirmAwardBidId(null);
      await loadDetail();
      onMutated(
        `已完成定标：${rfq.id} 由「${data.winnerSupplier}」中标（${formatCNY(
          data.awardedPrice
        )}）`
      );
    } catch {
      setAwardError('网络异常，定标失败');
    } finally {
      setAwarding(false);
    }
  };

  const statusMeta = rfq ? STATUS_META[rfq.status] : null;
  const referenceBudgetTotal = rfq
    ? rfq.items.reduce((sum, i) => sum + i.qty * i.refUnitPrice, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          {rfq && statusMeta ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                  {rfq.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                  {statusMeta.label}
                </span>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {rfq.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {getDeadlineBadge(rfq.deadline, rfq.status)}（截标:{' '}
                  {formatDateTime(rfq.deadline)}）
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{rfq.title}</h2>
              <p className="text-xs leading-relaxed text-slate-600">{rfq.description}</p>
            </div>
          ) : (
            <div className="py-2 text-sm font-semibold text-slate-700">
              正在加载询价单详情...
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
            aria-label="关闭详情"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {loading && !rfq && (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {rfq && (
            <>
              {/* Key metrics strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">含税预算上限</p>
                  <p className="tabular-nums mt-1 text-lg font-bold text-slate-900">
                    {formatCNY(rfq.budgetLimit)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">物料清单项数</p>
                  <p className="tabular-nums mt-1 text-lg font-bold text-slate-900">
                    {rfq.items.length} 项（参考 {formatCNY(referenceBudgetTotal)}）
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">已参与报价供应商</p>
                  <p className="tabular-nums mt-1 text-lg font-bold text-indigo-700">
                    {rfq.bidCount ?? bids.length} 家
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">
                    {user.role === 'SUPPLIER' ? '我方当前报价' : '当前最低报价'}
                  </p>
                  <p className="tabular-nums mt-1 text-lg font-bold text-emerald-600">
                    {user.role === 'SUPPLIER'
                      ? ownBid
                        ? formatCNY(ownBid.totalPrice)
                        : '尚未报价'
                      : rfq.lowestBidPrice != null
                        ? formatCNY(rfq.lowestBidPrice)
                        : '暂无报价'}
                  </p>
                </div>
              </div>

              {/* Section 1: BOM Line Items */}
              <section className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      采购物料明细清单（BOM）
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    币种：人民币 (CNY · 含13%增值税)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">物料编码</th>
                        <th className="px-4 py-2.5 font-semibold">物料名称</th>
                        <th className="px-4 py-2.5 font-semibold">技术规格</th>
                        <th className="px-4 py-2.5 font-semibold">需求数量</th>
                        <th className="px-4 py-2.5 text-right font-semibold">参考单价</th>
                        <th className="px-4 py-2.5 text-right font-semibold">参考小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {rfq.items.map((item) => (
                        <tr key={item.sku}>
                          <td className="px-4 py-2.5 font-mono text-slate-500">
                            {item.sku}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{item.spec}</td>
                          <td className="tabular-nums px-4 py-2.5">
                            {item.qty} {item.unit}
                          </td>
                          <td className="tabular-nums px-4 py-2.5 text-right">
                            {formatCNYExact(item.refUnitPrice)}
                          </td>
                          <td className="tabular-nums px-4 py-2.5 text-right font-semibold text-slate-900">
                            {formatCNY(item.qty * item.refUnitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 2: Supplier Online Bidding Workbench */}
              {user.role === 'SUPPLIER' && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                        <Send className="h-4 w-4 text-emerald-600" />
                        供应商在线分项竞价台 · {user.company}
                      </h3>
                      <p className="mt-0.5 text-xs text-emerald-800/80">
                        {rfq.status === 'OPEN'
                          ? ownBid
                            ? '您已提交过报价，可在截标前随时调整分项单价并更新报价。'
                            : '请按物料明细填报含税单价，系统将自动汇总总价并计算预算降本率。'
                          : '当前询价单已结束竞价，仅可查看历史报价与开标结果。'}
                      </p>
                    </div>
                    {ownBid && (
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                        当前已报价：{formatCNY(ownBid.totalPrice)}
                      </span>
                    )}
                  </div>

                  {rfq.status === 'OPEN' ? (
                    <form onSubmit={handleSubmitBid} className="space-y-4">
                      {bidError && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{bidError}</span>
                        </div>
                      )}

                      <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-2.5">物料名称 / SKU</th>
                              <th className="px-4 py-2.5">数量</th>
                              <th className="px-4 py-2.5">参考单价</th>
                              <th className="px-4 py-2.5">我方含税单价 (CNY) *</th>
                              <th className="px-4 py-2.5 text-right">分项小计</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rfq.items.map((item) => {
                              const currentUnit = Number(unitPrices[item.sku]) || 0;
                              const sub = currentUnit * item.qty;
                              return (
                                <tr key={item.sku}>
                                  <td className="px-4 py-2.5">
                                    <p className="font-semibold text-slate-900">
                                      {item.name}
                                    </p>
                                    <p className="font-mono text-[11px] text-slate-400">
                                      {item.sku}
                                    </p>
                                  </td>
                                  <td className="tabular-nums px-4 py-2.5 text-slate-700">
                                    {item.qty} {item.unit}
                                  </td>
                                  <td className="tabular-nums px-4 py-2.5 text-slate-500">
                                    {formatCNYExact(item.refUnitPrice)}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <input
                                      type="number"
                                      min={1}
                                      step="0.01"
                                      value={unitPrices[item.sku] ?? ''}
                                      onChange={(e) =>
                                        setUnitPrices((prev) => ({
                                          ...prev,
                                          [item.sku]: e.target.value,
                                        }))
                                      }
                                      className="tabular-nums w-36 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                      required
                                    />
                                  </td>
                                  <td className="tabular-nums px-4 py-2.5 text-right font-semibold text-slate-900">
                                    {formatCNY(sub)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            承诺交付周期 (天) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={leadDays}
                            onChange={(e) => setLeadDays(e.target.value)}
                            className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            质保周期 (个月) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={warrantyMonths}
                            onChange={(e) => setWarrantyMonths(e.target.value)}
                            className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            技术响应与服务承诺说明
                          </label>
                          <input
                            type="text"
                            value={proposalNote}
                            onChange={(e) => setProposalNote(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span>
                            汇总含税总报价：
                            <strong className="tabular-nums text-lg font-bold text-emerald-700">
                              {formatCNY(liveBidTotal)}
                            </strong>
                          </span>
                          <span
                            className={`tabular-nums rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              liveSavingsRate >= 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {liveSavingsRate >= 0
                              ? `低于预算上限 ${liveSavingsRate.toFixed(1)}%`
                              : `超出预算 ${Math.abs(liveSavingsRate).toFixed(1)}%`}
                          </span>
                        </div>
                        <button
                          type="submit"
                          disabled={submittingBid}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" />
                          {submittingBid
                            ? '提交中...'
                            : ownBid
                              ? '更新我的报价'
                              : '提交竞价报价'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs text-slate-600">
                      {ownBid
                        ? `您在本项目提交的最终报价为 ${formatCNY(
                            ownBid.totalPrice
                          )}（交期 ${ownBid.leadDays} 天 / 质保 ${
                            ownBid.warrantyMonths
                          } 个月）。${
                            ownBid.isWinner
                              ? '恭喜，贵司方案已中标！'
                              : rfq.status === 'AWARDED'
                                ? '本项目已授予其他供应商，感谢参与。'
                                : '当前正在进行评标委员会综合打分。'
                          }`
                        : '本项目已停止接收报价，您未参与本轮投标。'}
                    </div>
                  )}
                </section>
              )}

              {/* Section 3: Bid Comparison & Awarding Workbench */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      {user.role === 'BUYER' ? (
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-500" />
                      )}
                      {user.role === 'BUYER'
                        ? '多维度智能比价与开标定标台'
                        : '竞价实时排名与暗标脱敏公示'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {user.role === 'BUYER'
                        ? '综合评分权重：价格竞争力 55% + 交付周期 20% + 质保期限 15% + 历史履约率 10%'
                        : '暗标保护机制：可核对自身报价排名与交期对比，其他竞标人名称与金额已加密脱敏'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    共 {bids.length} 份有效报价
                  </span>
                </div>

                {awardError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{awardError}</span>
                  </div>
                )}

                {bids.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
                    暂无供应商提交报价，等待竞价参与中...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bids.map((bid) => {
                      const isConfirming = confirmAwardBidId === bid.id;
                      return (
                        <div
                          key={bid.id}
                          className={`rounded-2xl border p-4 transition ${
                            bid.isWinner
                              ? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
                              : bid.isOwn
                                ? 'border-emerald-300 bg-emerald-50/40'
                                : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            {/* Left: Supplier Identity & Badges */}
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-bold ${
                                    bid.rank === 1
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  价格顺位 #{bid.rank}
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                  {bid.supplierName}
                                </span>
                                {bid.supplierGrade && !bid.isMasked && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                    <ShieldCheck className="h-3 w-3" />
                                    {bid.supplierGrade} · 履约 {bid.fulfillmentRate}%
                                  </span>
                                )}
                                {bid.isOwn && (
                                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                    我的报价
                                  </span>
                                )}
                                {bid.isWinner && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                    <Trophy className="h-3 w-3" />
                                    已中标
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600">{bid.proposalNote}</p>
                            </div>

                            {/* Right: Price & Action */}
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="text-right">
                                <p className="text-[11px] text-slate-500">报价总额</p>
                                <p className="tabular-nums text-lg font-bold text-slate-900">
                                  {bid.isMasked ? '¥ *** , ***' : formatCNY(bid.totalPrice)}
                                </p>
                                {!bid.isMasked && bid.savingsRate != null && (
                                  <p
                                    className={`tabular-nums text-[11px] font-semibold ${
                                      bid.savingsRate >= 0
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {bid.savingsRate >= 0
                                      ? `节约 ${formatCNY(bid.savingsAmount)} (${
                                          bid.savingsRate
                                        }%)`
                                      : `超预算 ${formatCNY(
                                          Math.abs(bid.savingsAmount ?? 0)
                                        )}`}
                                  </p>
                                )}
                              </div>

                              {user.role === 'BUYER' && rfq.status !== 'AWARDED' && (
                                <div className="flex items-center gap-2">
                                  {isConfirming ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={awarding}
                                        onClick={() => void handleAwardBid(bid)}
                                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {awarding ? '定标中...' : '确认定标'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={awarding}
                                        onClick={() => setConfirmAwardBidId(null)}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                      >
                                        取消
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmAwardBidId(bid.id)}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                                    >
                                      <Award className="h-3.5 w-3.5" />
                                      一键定标
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bid Metrics & Score Breakdown */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                            <div className="flex flex-wrap items-center gap-4">
                              <span>
                                交付周期：
                                <strong className="tabular-nums text-slate-900">
                                  {bid.leadDays} 天
                                </strong>
                              </span>
                              <span>
                                质保期：
                                <strong className="tabular-nums text-slate-900">
                                  {bid.warrantyMonths} 个月
                                </strong>
                              </span>
                              <span>提交时间：{formatDateTime(bid.submittedAt)}</span>
                            </div>

                            {!bid.isMasked && bid.compositeScore != null && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px]">
                                  价格 {bid.priceScore}
                                </span>
                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px]">
                                  交期 {bid.deliveryScore}
                                </span>
                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px]">
                                  质保 {bid.warrantyScore}
                                </span>
                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px]">
                                  履约 {bid.creditScore}
                                </span>
                                <span className="tabular-nums rounded-lg bg-indigo-600 px-2.5 py-0.5 font-bold text-white">
                                  综合得分 {bid.compositeScore}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Unmasked Line Item Breakdown */}
                          {!bid.isMasked && bid.itemPrices.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {bid.itemPrices.map((ip) => (
                                <span
                                  key={ip.sku}
                                  className="tabular-nums rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700"
                                >
                                  <span className="font-mono text-slate-500">
                                    {ip.sku}
                                  </span>
                                  ：单价 {formatCNYExact(ip.unitPrice)} · 小计{' '}
                                  {formatCNY(ip.subtotal)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
