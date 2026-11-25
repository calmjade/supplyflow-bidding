import type { BidItemPrice, SupplierBidView } from '@/types';

export interface RawBidRow {
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier_name: string;
  total_price: number;
  lead_days: number;
  warranty_months: number;
  proposal_note: string;
  item_prices_json: string;
  is_winner: number;
  submitted_at: string;
  supplier_grade?: string;
  fulfillment_rate?: number;
}

/**
 * Compute weighted composite evaluation score (0-100) for Buyer bid comparison:
 * - Price competitiveness (55%): relative to lowest bid and budget limit
 * - Delivery lead time (20%): shorter lead time scores higher
 * - Warranty coverage (15%): longer warranty scores higher
 * - Historical supplier fulfillment (10%): supplier fulfillment rate
 */
export function evaluateAndRankBids(
  rows: RawBidRow[],
  budgetLimit: number,
  viewerRole: 'BUYER' | 'SUPPLIER',
  viewerId: string
): SupplierBidView[] {
  if (rows.length === 0) return [];

  const minPrice = Math.min(...rows.map((r) => r.total_price));
  const minLead = Math.min(...rows.map((r) => r.lead_days));
  const maxWarranty = Math.max(...rows.map((r) => r.warranty_months), 12);

  const scored = rows.map((row) => {
    const priceRatio = minPrice > 0 ? minPrice / row.total_price : 1;
    const budgetPenalty = row.total_price > budgetLimit ? 0.82 : 1;
    const priceScore = Number((priceRatio * 100 * budgetPenalty).toFixed(1));

    const deliveryRatio = minLead > 0 ? minLead / Math.max(row.lead_days, 1) : 1;
    const deliveryScore = Number((Math.min(1, deliveryRatio) * 100).toFixed(1));

    const warrantyScore = Number(
      (Math.min(1, row.warranty_months / maxWarranty) * 100).toFixed(1)
    );

    const creditScore = Number(
      Math.min(100, row.fulfillment_rate ?? 95).toFixed(1)
    );

    const compositeScore = Number(
      (
        priceScore * 0.55 +
        deliveryScore * 0.2 +
        warrantyScore * 0.15 +
        creditScore * 0.1
      ).toFixed(1)
    );

    const savingsAmount = Number((budgetLimit - row.total_price).toFixed(2));
    const savingsRate =
      budgetLimit > 0
        ? Number((((budgetLimit - row.total_price) / budgetLimit) * 100).toFixed(2))
        : 0;

    let itemPrices: BidItemPrice[] = [];
    try {
      itemPrices = JSON.parse(row.item_prices_json) as BidItemPrice[];
    } catch {
      itemPrices = [];
    }

    return {
      row,
      itemPrices,
      priceScore,
      deliveryScore,
      warrantyScore,
      creditScore,
      compositeScore,
      savingsAmount,
      savingsRate,
    };
  });

  // Sort by price ascending for transparent rank; winner always highlighted on UI
  const sortedByPrice = [...scored].sort((a, b) => a.row.total_price - b.row.total_price);

  return sortedByPrice.map((entry, idx) => {
    const { row } = entry;
    const isOwn = row.supplier_id === viewerId;
    const shouldMask = viewerRole === 'SUPPLIER' && !isOwn;

    if (shouldMask) {
      return {
        id: row.id,
        rfqId: row.rfq_id,
        supplierId: 'masked',
        supplierName: `竞价供应商 #${idx + 1}（已加密脱敏）`,
        totalPrice: 0,
        leadDays: row.lead_days,
        warrantyMonths: row.warranty_months,
        proposalNote: '暗标保护期：竞争对手详细报价与技术方案仅采购评标委员会可见',
        itemPrices: [],
        isWinner: row.is_winner === 1,
        submittedAt: row.submitted_at,
        isOwn: false,
        isMasked: true,
        rank: idx + 1,
      };
    }

    return {
      id: row.id,
      rfqId: row.rfq_id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierGrade: row.supplier_grade,
      fulfillmentRate: row.fulfillment_rate,
      totalPrice: row.total_price,
      leadDays: row.lead_days,
      warrantyMonths: row.warranty_months,
      proposalNote: row.proposal_note,
      itemPrices: entry.itemPrices,
      isWinner: row.is_winner === 1,
      submittedAt: row.submitted_at,
      isOwn,
      isMasked: false,
      rank: idx + 1,
      compositeScore: entry.compositeScore,
      priceScore: entry.priceScore,
      deliveryScore: entry.deliveryScore,
      warrantyScore: entry.warrantyScore,
      creditScore: entry.creditScore,
      savingsAmount: entry.savingsAmount,
      savingsRate: entry.savingsRate,
    };
  });
}
