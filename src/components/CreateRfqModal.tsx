'use client';

import { useState } from 'react';
import { Plus, Trash2, X, Calculator, AlertCircle } from 'lucide-react';
import { API_BASE, CATEGORIES, formatCNY } from '@/lib/format';
import type { RfqLineItem, RfqProject } from '@/types';

interface CreateRfqModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (rfq: RfqProject) => void;
}

function defaultDeadlineInput(): string {
  const target = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  target.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(
    target.getDate()
  )}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
}

function createEmptyItem(index: number): RfqLineItem {
  return {
    sku: `MAT-2026-${String(index + 1).padStart(2, '0')}`,
    name: '',
    spec: '',
    unit: '套',
    qty: 1,
    refUnitPrice: 10000,
  };
}

export function CreateRfqModal({ open, onClose, onCreated }: CreateRfqModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [budgetLimit, setBudgetLimit] = useState('500000');
  const [deadline, setDeadline] = useState(defaultDeadlineInput);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<RfqLineItem[]>([createEmptyItem(0)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const referenceTotal = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.refUnitPrice) || 0),
    0
  );

  const updateItem = <K extends keyof RfqLineItem>(
    idx: number,
    key: K,
    value: RfqLineItem[K]
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length)]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleApplyRefTotal = () => {
    if (referenceTotal > 0) {
      setBudgetLimit(String(Math.round(referenceTotal)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedBudget = Number(budgetLimit);
    if (!title.trim()) {
      setError('请填写询价单标题');
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError('请填写有效的预算上限金额');
      return;
    }
    if (!deadline) {
      setError('请选择截标时间');
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setError('请填写所有物料明细的名称');
      return;
    }

    setSubmitting(true);
    try {
      const isoDeadline = new Date(deadline).toISOString();
      const res = await fetch(`${API_BASE}/rfqs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          budgetLimit: parsedBudget,
          deadline: isoDeadline,
          description: description.trim(),
          items,
        }),
      });
      const data = (await res.json()) as { rfq?: RfqProject; error?: string };
      if (!res.ok || !data.rfq) {
        setError(data.error || '发布询价单失败');
        return;
      }

      setTitle('');
      setDescription('');
      setBudgetLimit('500000');
      setDeadline(defaultDeadlineInput());
      setItems([createEmptyItem(0)]);
      onCreated(data.rfq);
    } catch {
      setError('网络请求异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">发布新询价单（RFQ）</h2>
            <p className="text-xs text-slate-500">
              发布后状态为「竞价中」，所有合格供应商可立即查看技术要求并参与在线分项竞价
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                询价项目标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：华南智能车间 AGV 搬运机器人及调度系统采购"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                采购品类 *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                截标时间 *
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  含税预算上限 (CNY) *
                </label>
                <button
                  type="button"
                  onClick={handleApplyRefTotal}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <Calculator className="h-3 w-3" />
                  填入参考合计 ({formatCNY(referenceTotal)})
                </button>
              </div>
              <input
                type="number"
                min={1}
                step="100"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="tabular-nums w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                技术规范与交付说明
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="验收标准、质保要求或现场交付条件（选填）"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  采购物料清单（BOM 明细）
                </h3>
                <p className="text-xs text-slate-500">
                  当前参考总价合计：
                  <span className="tabular-nums font-semibold text-slate-800">
                    {formatCNY(referenceTotal)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" />
                新增物料行
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      物料编码 (SKU)
                    </label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      物料名称 *
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      placeholder="如：潜伏顶升式AGV"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      规格型号
                    </label>
                    <input
                      type="text"
                      value={item.spec}
                      onChange={(e) => updateItem(idx, 'spec', e.target.value)}
                      placeholder="如：负载1000kg / 激光SLAM"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      单位
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      数量
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(idx, 'qty', Math.max(1, Number(e.target.value) || 1))
                      }
                      className="tabular-nums w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end gap-1.5 sm:col-span-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">
                        参考单价 (¥)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.refUnitPrice}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            'refUnitPrice',
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="tabular-nums w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="删除该行"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? '正在发布...' : '立即发布招标'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
