import { NextResponse } from 'next/server';
import type { SqlValue } from 'sql.js';
import { getCurrentUser } from '@/lib/auth';
import { getDb, queryAll, queryOne } from '@/lib/db';
import { evaluateAndRankBids, type RawBidRow } from '@/lib/scoring';
import type { RfqLineItem, RfqProject, RfqStatus } from '@/types';

export const dynamic = 'force-dynamic';

interface RfqDbRow {
  [key: string]: SqlValue;
  id: string;
  title: string;
  category: string;
  budget_limit: number;
  deadline: string;
  status: string;
  description: string;
  items_json: string;
  created_by: string;
  created_at: string;
  awarded_bid_id: string | null;
}

interface JoinedBidRow {
  [key: string]: SqlValue;
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
  supplier_grade: string | null;
  fulfillment_rate: number | null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const db = await getDb();

  const row = queryOne<RfqDbRow>(
    db,
    'SELECT * FROM rfq_projects WHERE id = ?',
    [id]
  );

  if (!row) {
    return NextResponse.json({ error: '未找到指定询价单' }, { status: 404 });
  }

  let items: RfqLineItem[] = [];
  try {
    items = JSON.parse(row.items_json) as RfqLineItem[];
  } catch {
    items = [];
  }

  const bidRows = queryAll<JoinedBidRow>(
    db,
    `SELECT b.*, s.grade as supplier_grade, s.fulfillment_rate as fulfillment_rate
     FROM supplier_bids b
     LEFT JOIN suppliers s ON b.supplier_id = s.id
     WHERE b.rfq_id = ?
     ORDER BY b.total_price ASC`,
    [id]
  );

  const rawBids: RawBidRow[] = bidRows.map((b) => ({
    id: String(b.id),
    rfq_id: String(b.rfq_id),
    supplier_id: String(b.supplier_id),
    supplier_name: String(b.supplier_name),
    total_price: Number(b.total_price),
    lead_days: Number(b.lead_days),
    warranty_months: Number(b.warranty_months),
    proposal_note: String(b.proposal_note),
    item_prices_json: String(b.item_prices_json),
    is_winner: Number(b.is_winner),
    submitted_at: String(b.submitted_at),
    supplier_grade: b.supplier_grade ? String(b.supplier_grade) : 'AA',
    fulfillment_rate: b.fulfillment_rate != null ? Number(b.fulfillment_rate) : 95,
  }));

  const bids = evaluateAndRankBids(
    rawBids,
    Number(row.budget_limit),
    user.role,
    user.id
  );

  const myOwnBid = bids.find((b) => b.isOwn);

  const rfq: RfqProject = {
    id: row.id,
    title: row.title,
    category: row.category,
    budgetLimit: Number(row.budget_limit),
    deadline: row.deadline,
    status: row.status as RfqStatus,
    description: row.description,
    items,
    createdBy: row.created_by,
    createdAt: row.created_at,
    awardedBidId: row.awarded_bid_id,
    bidCount: rawBids.length,
    lowestBidPrice:
      user.role === 'BUYER' || row.status === 'AWARDED'
        ? rawBids.length > 0
          ? Math.min(...rawBids.map((b) => b.total_price))
          : null
        : null,
    myBidPrice: myOwnBid ? myOwnBid.totalPrice : null,
    hasMyBid: Boolean(myOwnBid),
  };

  return NextResponse.json({ rfq, bids, user });
}
