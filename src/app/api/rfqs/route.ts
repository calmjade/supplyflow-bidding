import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, queryAll, queryOne, saveDb } from '@/lib/db';
import type { RfqLineItem, RfqProject, RfqStatus } from '@/types';

export const dynamic = 'force-dynamic';

interface RfqDbRow {
  [key: string]: string | number | Uint8Array | null;
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

interface BidStatRow {
  [key: string]: string | number | Uint8Array | null;
  rfq_id: string;
  bid_count: number;
  min_price: number | null;
}

interface MyBidRow {
  [key: string]: string | number | Uint8Array | null;
  rfq_id: string;
  total_price: number;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const db = await getDb();

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category');
  const keyword = searchParams.get('q')?.trim().toLowerCase() ?? '';

  const rows = queryAll<RfqDbRow>(
    db,
    'SELECT * FROM rfq_projects ORDER BY created_at DESC'
  );
  const bidStats = queryAll<BidStatRow>(
    db,
    'SELECT rfq_id, COUNT(*) as bid_count, MIN(total_price) as min_price FROM supplier_bids GROUP BY rfq_id'
  );
  const statMap = new Map(bidStats.map((s) => [s.rfq_id, s]));

  const myBids =
    user.role === 'SUPPLIER'
      ? queryAll<MyBidRow>(
          db,
          'SELECT rfq_id, total_price FROM supplier_bids WHERE supplier_id = ?',
          [user.id]
        )
      : [];
  const myBidMap = new Map(myBids.map((b) => [b.rfq_id, Number(b.total_price)]));

  const rfqs: RfqProject[] = rows
    .map((row) => {
      let items: RfqLineItem[] = [];
      try {
        items = JSON.parse(row.items_json) as RfqLineItem[];
      } catch {
        items = [];
      }
      const stat = statMap.get(row.id);
      const myBidPrice = myBidMap.get(row.id) ?? null;

      return {
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
        bidCount: Number(stat?.bid_count ?? 0),
        lowestBidPrice:
          user.role === 'BUYER' || row.status === 'AWARDED'
            ? stat?.min_price != null
              ? Number(stat.min_price)
              : null
            : null,
        myBidPrice,
        hasMyBid: myBidPrice !== null,
      };
    })
    .filter((rfq) => {
      if (statusFilter && statusFilter !== 'ALL' && rfq.status !== statusFilter) {
        return false;
      }
      if (
        categoryFilter &&
        categoryFilter !== 'ALL' &&
        rfq.category !== categoryFilter
      ) {
        return false;
      }
      if (keyword) {
        const hay = `${rfq.id} ${rfq.title} ${rfq.category} ${rfq.description}`.toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      return true;
    });

  return NextResponse.json({ rfqs, user });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user.role !== 'BUYER') {
    return NextResponse.json(
      { error: '仅采购方角色可发布新的询价单' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      category?: string;
      budgetLimit?: number;
      deadline?: string;
      description?: string;
      items?: RfqLineItem[];
    };

    const title = body.title?.trim();
    const category = body.category?.trim();
    const budgetLimit = Number(body.budgetLimit);
    const deadline = body.deadline?.trim();
    const description = body.description?.trim() || '请按采购技术规范书提交分项报价及最短交期承诺。';
    const items = Array.isArray(body.items) ? body.items : [];

    if (!title || !category || !Number.isFinite(budgetLimit) || budgetLimit <= 0 || !deadline) {
      return NextResponse.json(
        { error: '请填写完整的询价单标题、品类、预算上限及截止时间' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: '请至少添加一条采购物料明细' },
        { status: 400 }
      );
    }

    const sanitizedItems: RfqLineItem[] = items.map((item, index) => ({
      sku: (item.sku || `MAT-${Date.now()}-${index + 1}`).trim(),
      name: (item.name || '').trim(),
      spec: (item.spec || '标准工业级').trim(),
      unit: (item.unit || '套').trim(),
      qty: Math.max(1, Number(item.qty) || 1),
      refUnitPrice: Math.max(1, Number(item.refUnitPrice) || 1000),
    }));

    if (sanitizedItems.some((item) => !item.name)) {
      return NextResponse.json(
        { error: '物料明细名称不能为空' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const countRow = queryOne<{ cnt: number }>(
      db,
      'SELECT COUNT(*) as cnt FROM rfq_projects'
    );
    const nextNum = Number(countRow?.cnt ?? 0) + 1;
    const id = `RFQ-2026-${String(nextNum).padStart(3, '0')}`;
    const createdAt = new Date().toISOString();

    db.run(
      `INSERT INTO rfq_projects (id, title, category, budget_limit, deadline, status, description, items_json, created_by, created_at, awarded_bid_id)
       VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, NULL)`,
      [
        id,
        title,
        category,
        budgetLimit,
        deadline,
        description,
        JSON.stringify(sanitizedItems),
        user.id,
        createdAt,
      ]
    );
    saveDb(db);

    const rfq: RfqProject = {
      id,
      title,
      category,
      budgetLimit,
      deadline,
      status: 'OPEN',
      description,
      items: sanitizedItems,
      createdBy: user.id,
      createdAt,
      awardedBidId: null,
      bidCount: 0,
      lowestBidPrice: null,
      myBidPrice: null,
      hasMyBid: false,
    };

    return NextResponse.json({ rfq }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '创建询价单失败，请检查提交参数' }, { status: 400 });
  }
}
