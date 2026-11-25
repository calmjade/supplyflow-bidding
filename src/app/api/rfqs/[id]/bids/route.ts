import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, queryOne, saveDb } from '@/lib/db';
import type { BidItemPrice, RfqLineItem } from '@/types';

interface RfqRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
  status: string;
  items_json: string;
}

interface ExistingBidRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rfqId } = await context.params;
  const user = await getCurrentUser();

  if (user.role !== 'SUPPLIER') {
    return NextResponse.json(
      { error: '请切换至供应商角色后再提交竞价报价' },
      { status: 403 }
    );
  }

  const db = await getDb();
  const rfq = queryOne<RfqRow>(
    db,
    'SELECT id, status, items_json FROM rfq_projects WHERE id = ?',
    [rfqId]
  );

  if (!rfq) {
    return NextResponse.json({ error: '询价单不存在' }, { status: 404 });
  }

  if (rfq.status !== 'OPEN') {
    return NextResponse.json(
      { error: '当前询价单非竞价中状态，已停止接收新报价' },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as {
      itemPrices?: Array<{ sku: string; unitPrice: number }>;
      totalPrice?: number;
      leadDays?: number;
      warrantyMonths?: number;
      proposalNote?: string;
    };

    const rfqItems = JSON.parse(rfq.items_json) as RfqLineItem[];
    const leadDays = Math.floor(Number(body.leadDays));
    const warrantyMonths = Math.floor(Number(body.warrantyMonths));
    const proposalNote =
      body.proposalNote?.trim() || '严格响应技术规格要求，保障按期交付与原厂质保。';

    if (!Number.isFinite(leadDays) || leadDays <= 0) {
      return NextResponse.json({ error: '交付周期必须大于 0 天' }, { status: 400 });
    }
    if (!Number.isFinite(warrantyMonths) || warrantyMonths <= 0) {
      return NextResponse.json({ error: '质保周期必须大于 0 个月' }, { status: 400 });
    }

    let normalizedItemPrices: BidItemPrice[] = [];
    let computedTotal = 0;

    if (Array.isArray(body.itemPrices) && body.itemPrices.length > 0) {
      const priceBySku = new Map(
        body.itemPrices.map((p) => [p.sku, Number(p.unitPrice)])
      );
      normalizedItemPrices = rfqItems.map((item) => {
        const unitPrice = priceBySku.get(item.sku) ?? item.refUnitPrice;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error(`物料 ${item.sku} 单价必须大于 0`);
        }
        const subtotal = Number((unitPrice * item.qty).toFixed(2));
        computedTotal += subtotal;
        return {
          sku: item.sku,
          unitPrice: Number(unitPrice.toFixed(2)),
          subtotal,
        };
      });
      computedTotal = Number(computedTotal.toFixed(2));
    } else if (body.totalPrice && Number(body.totalPrice) > 0) {
      computedTotal = Number(Number(body.totalPrice).toFixed(2));
      const totalRef = rfqItems.reduce(
        (sum, item) => sum + item.refUnitPrice * item.qty,
        0
      );
      const ratio = totalRef > 0 ? computedTotal / totalRef : 1;
      normalizedItemPrices = rfqItems.map((item) => {
        const unitPrice = Number((item.refUnitPrice * ratio).toFixed(2));
        return {
          sku: item.sku,
          unitPrice,
          subtotal: Number((unitPrice * item.qty).toFixed(2)),
        };
      });
    } else {
      return NextResponse.json(
        { error: '请填写有效的分项单价或总报价金额' },
        { status: 400 }
      );
    }

    const existing = queryOne<ExistingBidRow>(
      db,
      'SELECT id FROM supplier_bids WHERE rfq_id = ? AND supplier_id = ?',
      [rfqId, user.id]
    );

    const submittedAt = new Date().toISOString();
    let bidId: string;

    if (existing) {
      bidId = existing.id;
      db.run(
        `UPDATE supplier_bids
         SET supplier_name = ?, total_price = ?, lead_days = ?, warranty_months = ?, proposal_note = ?, item_prices_json = ?, submitted_at = ?
         WHERE id = ?`,
        [
          user.company,
          computedTotal,
          leadDays,
          warrantyMonths,
          proposalNote,
          JSON.stringify(normalizedItemPrices),
          submittedAt,
          bidId,
        ]
      );
    } else {
      bidId = `BID-${rfqId.replace('RFQ-2026-', '')}-${user.id.replace('sup-', '').toUpperCase()}`;
      db.run(
        `INSERT INTO supplier_bids (id, rfq_id, supplier_id, supplier_name, total_price, lead_days, warranty_months, proposal_note, item_prices_json, is_winner, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          bidId,
          rfqId,
          user.id,
          user.company,
          computedTotal,
          leadDays,
          warrantyMonths,
          proposalNote,
          JSON.stringify(normalizedItemPrices),
          submittedAt,
        ]
      );
    }

    saveDb(db);

    return NextResponse.json(
      {
        bid: {
          id: bidId,
          rfqId,
          supplierId: user.id,
          supplierName: user.company,
          totalPrice: computedTotal,
          leadDays,
          warrantyMonths,
          proposalNote,
          itemPrices: normalizedItemPrices,
          submittedAt,
          updated: Boolean(existing),
        },
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '提交报价失败，请核对输入格式',
      },
      { status: 400 }
    );
  }
}
