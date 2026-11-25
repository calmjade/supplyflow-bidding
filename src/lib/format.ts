import type { RfqStatus } from '@/types';

export const API_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api`;

export function formatCNY(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCNYExact(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDeadlineBadge(deadlineIso: string, status: RfqStatus): string {
  if (status === 'AWARDED') return '已完成定标';
  if (status === 'REVIEWING') return '截标评审中';
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (Number.isNaN(diffMs)) return deadlineIso;
  if (diffMs <= 0) return '即将截标';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `距截标 ${days} 天 ${hours} 小时`;
  return `距截标 ${Math.max(1, hours)} 小时`;
}

export const STATUS_META: Record<
  RfqStatus,
  { label: string; className: string; dotClass: string }
> = {
  OPEN: {
    label: '竞价中',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  REVIEWING: {
    label: '评审中',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  AWARDED: {
    label: '已定标',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
};

export const CATEGORIES = [
  '智能制造装备',
  '工业物联网',
  '精密机电部件',
  '绿色能源设施',
  '企业数字化硬件',
  '厂区自动化改造',
] as const;
