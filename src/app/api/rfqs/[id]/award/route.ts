import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, queryOne, saveDb } from '@/lib/db';

interface RfqRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
  status: string;
}

interface BidRow {
  [key: string]: string | number | Uint8Array | null;
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier_name: string;
  total_price: number;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rfqId } = await context.params;
  const user = await getCurrentUser();

  if (user.role !== 'BUYER') {
    return NextResponse.json(
      { error: '仅采购方主持人具备定标权限' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { bidId?: string };
    const bidId = body.bidId?.trim();
    if (!bidId) {
      return NextResponse.json({ error: '缺少中标报价 ID' }, { status: 400 });
    }

    const db = await getDb();
    const rfq = queryOne<RfqRow>(
      db,
      'SELECT id, status FROM rfq_projects WHERE id = ?',
      [rfqId]
    );
    if (!rfq) {
      return NextResponse.json({ error: '询价单不存在' }, { status: 404 });
    }
    if (rfq.status === 'AWARDED') {
      return NextResponse.json({ error: '该询价单已完成定标' }, { status: 400 });
    }

    const bid = queryOne<BidRow>(
      db,
      'SELECT id, rfq_id, supplier_id, supplier_name, total_price FROM supplier_bids WHERE id = ? AND rfq_id = ?',
      [bidId, rfqId]
    );
    if (!bid) {
      return NextResponse.json(
        { error: '未找到对应的供应商报价记录' },
        { status: 404 }
      );
    }

    db.run('UPDATE supplier_bids SET is_winner = 0 WHERE rfq_id = ?', [rfqId]);
    db.run('UPDATE supplier_bids SET is_winner = 1 WHERE id = ?', [bidId]);
    db.run(
      "UPDATE rfq_projects SET status = 'AWARDED', awarded_bid_id = ? WHERE id = ?",
      [bidId, rfqId]
    );
    db.run(
      'UPDATE suppliers SET total_awarded_amount = total_awarded_amount + ? WHERE id = ?',
      [Number(bid.total_price), bid.supplier_id]
    );

    saveDb(db);

    return NextResponse.json({
      success: true,
      rfqId,
      awardedBidId: bidId,
      winnerSupplier: bid.supplier_name,
      awardedPrice: Number(bid.total_price),
    });
  } catch {
    return NextResponse.json({ error: '定标请求处理失败' }, { status: 400 });
  }
}
