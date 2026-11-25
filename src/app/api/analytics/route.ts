import { NextResponse } from 'next/server';
import { getDb, queryAll } from '@/lib/db';
import type { AnalyticsData } from '@/types';

export const dynamic = 'force-dynamic';

interface RfqSummaryRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
  category: string;
  budget_limit: number;
  status: string;
  awarded_bid_id: string | null;
}

interface BidRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
  rfq_id: string;
  supplier_id: string;
  total_price: number;
  is_winner: number;
}

interface SupplierRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
  name: string;
  grade: string;
  fulfillment_rate: number;
  total_awarded_amount: number;
  contact_name: string;
  contact_phone: string;
  category_focus: string;
}

export async function GET() {
  const db = await getDb();

  const rfqs = queryAll<RfqSummaryRow>(
    db,
    'SELECT id, category, budget_limit, status, awarded_bid_id FROM rfq_projects'
  );
  const bids = queryAll<BidRow>(
    db,
    'SELECT id, rfq_id, supplier_id, total_price, is_winner FROM supplier_bids'
  );
  const suppliers = queryAll<SupplierRow>(
    db,
    'SELECT * FROM suppliers ORDER BY total_awarded_amount DESC'
  );

  const bidMap = new Map(bids.map((b) => [b.id, b]));
  const rfqMap = new Map(rfqs.map((r) => [r.id, r]));

  let totalBudget = 0;
  let awardedBudget = 0;
  let awardedSpend = 0;
  let openRfqCount = 0;
  let reviewingRfqCount = 0;
  let awardedRfqCount = 0;

  const categoryAgg = new Map<
    string,
    { rfqCount: number; budgetLimit: number; awardedBudget: number; awardedSpend: number }
  >();

  for (const rfq of rfqs) {
    const budget = Number(rfq.budget_limit);
    totalBudget += budget;

    if (rfq.status === 'OPEN') openRfqCount++;
    else if (rfq.status === 'REVIEWING') reviewingRfqCount++;
    else if (rfq.status === 'AWARDED') awardedRfqCount++;

    const cat = categoryAgg.get(rfq.category) ?? {
      rfqCount: 0,
      budgetLimit: 0,
      awardedBudget: 0,
      awardedSpend: 0,
    };
    cat.rfqCount += 1;
    cat.budgetLimit += budget;

    if (rfq.status === 'AWARDED' && rfq.awarded_bid_id) {
      const winBid = bidMap.get(rfq.awarded_bid_id);
      if (winBid) {
        const spend = Number(winBid.total_price);
        awardedBudget += budget;
        awardedSpend += spend;
        cat.awardedBudget += budget;
        cat.awardedSpend += spend;
      }
    }
    categoryAgg.set(rfq.category, cat);
  }

  const totalSavings = Math.max(0, Number((awardedBudget - awardedSpend).toFixed(2)));
  const savingsRate =
    awardedBudget > 0
      ? Number(((totalSavings / awardedBudget) * 100).toFixed(2))
      : 0;

  const categoryBreakdown = Array.from(categoryAgg.entries())
    .map(([category, agg]) => {
      const catSavings = Math.max(0, agg.awardedBudget - agg.awardedSpend);
      return {
        category,
        rfqCount: agg.rfqCount,
        budgetLimit: Number(agg.budgetLimit.toFixed(2)),
        awardedSpend: Number(agg.awardedSpend.toFixed(2)),
        savingsRate:
          agg.awardedBudget > 0
            ? Number(((catSavings / agg.awardedBudget) * 100).toFixed(2))
            : 0,
      };
    })
    .sort((a, b) => b.budgetLimit - a.budgetLimit);

  const supplierLeaderboard = suppliers.map((s) => {
    const supBids = bids.filter((b) => b.supplier_id === s.id);
    const winBids = supBids.filter((b) => Number(b.is_winner) === 1);
    const savingsList = supBids.map((b) => {
      const r = rfqMap.get(b.rfq_id);
      if (!r || Number(r.budget_limit) <= 0) return 0;
      return ((Number(r.budget_limit) - Number(b.total_price)) / Number(r.budget_limit)) * 100;
    });
    const avgSavingsRate =
      savingsList.length > 0
        ? Number(
            (
              savingsList.reduce((acc, v) => acc + v, 0) / savingsList.length
            ).toFixed(2)
          )
        : 0;

    return {
      id: s.id,
      name: s.name,
      grade: s.grade as 'AAA' | 'AA' | 'A',
      fulfillmentRate: Number(s.fulfillment_rate),
      totalAwardedAmount: Number(s.total_awarded_amount),
      contactName: s.contact_name,
      contactPhone: s.contact_phone,
      categoryFocus: s.category_focus,
      bidCount: supBids.length,
      winCount: winBids.length,
      winRate:
        supBids.length > 0
          ? Number(((winBids.length / supBids.length) * 100).toFixed(1))
          : 0,
      avgSavingsRate,
    };
  });

  const payload: AnalyticsData = {
    summary: {
      totalBudget: Number(totalBudget.toFixed(2)),
      awardedBudget: Number(awardedBudget.toFixed(2)),
      awardedSpend: Number(awardedSpend.toFixed(2)),
      totalSavings,
      savingsRate,
      activeSupplierCount: suppliers.length,
      openRfqCount,
      reviewingRfqCount,
      awardedRfqCount,
      totalBidsCount: bids.length,
    },
    categoryBreakdown,
    supplierLeaderboard,
  };

  return NextResponse.json(payload);
}
