import { NextResponse } from 'next/server';
import { getDb, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const rfqRow = queryOne<{ cnt: number }>(
      db,
      'SELECT COUNT(*) as cnt FROM rfq_projects'
    );
    const bidRow = queryOne<{ cnt: number }>(
      db,
      'SELECT COUNT(*) as cnt FROM supplier_bids'
    );

    return NextResponse.json({
      status: 'UP',
      service: 'supplyflow-bidding',
      rfqCount: Number(rfqRow?.cnt ?? 0),
      bidCount: Number(bidRow?.cnt ?? 0),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'DOWN',
        service: 'supplyflow-bidding',
        error: error instanceof Error ? error.message : 'Database error',
      },
      { status: 500 }
    );
  }
}
