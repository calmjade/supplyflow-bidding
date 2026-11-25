export type UserRole = 'BUYER' | 'SUPPLIER';

export type DemoRoleKey = 'buyer' | 'supplier-a' | 'supplier-b';

export interface SessionUser {
  key: DemoRoleKey;
  id: string;
  name: string;
  role: UserRole;
  company: string;
  badge: string;
}

export type RfqStatus = 'OPEN' | 'REVIEWING' | 'AWARDED';

export interface RfqLineItem {
  sku: string;
  name: string;
  spec: string;
  unit: string;
  qty: number;
  refUnitPrice: number;
}

export interface BidItemPrice {
  sku: string;
  unitPrice: number;
  subtotal: number;
}

export interface SupplierProfile {
  id: string;
  name: string;
  grade: 'AAA' | 'AA' | 'A';
  fulfillmentRate: number;
  totalAwardedAmount: number;
  contactName: string;
  contactPhone: string;
  categoryFocus: string;
}

export interface RfqProject {
  id: string;
  title: string;
  category: string;
  budgetLimit: number;
  deadline: string;
  status: RfqStatus;
  description: string;
  items: RfqLineItem[];
  createdBy: string;
  createdAt: string;
  awardedBidId: string | null;
  bidCount?: number;
  lowestBidPrice?: number | null;
  myBidPrice?: number | null;
  hasMyBid?: boolean;
}

export interface SupplierBidView {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  supplierGrade?: string;
  fulfillmentRate?: number;
  totalPrice: number;
  leadDays: number;
  warrantyMonths: number;
  proposalNote: string;
  itemPrices: BidItemPrice[];
  isWinner: boolean;
  submittedAt: string;
  isOwn: boolean;
  isMasked: boolean;
  rank: number;
  compositeScore?: number;
  priceScore?: number;
  deliveryScore?: number;
  warrantyScore?: number;
  creditScore?: number;
  savingsAmount?: number;
  savingsRate?: number;
}

export interface AnalyticsData {
  summary: {
    totalBudget: number;
    awardedBudget: number;
    awardedSpend: number;
    totalSavings: number;
    savingsRate: number;
    activeSupplierCount: number;
    openRfqCount: number;
    reviewingRfqCount: number;
    awardedRfqCount: number;
    totalBidsCount: number;
  };
  categoryBreakdown: Array<{
    category: string;
    rfqCount: number;
    budgetLimit: number;
    awardedSpend: number;
    savingsRate: number;
  }>;
  supplierLeaderboard: Array<
    SupplierProfile & {
      bidCount: number;
      winCount: number;
      winRate: number;
      avgSavingsRate: number;
    }
  >;
}
