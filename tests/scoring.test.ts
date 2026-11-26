import { describe, expect, it } from 'vitest';
import { evaluateAndRankBids, type RawBidRow } from '../src/lib/scoring';

describe('evaluateAndRankBids', () => {
  const sampleBids: RawBidRow[] = [
    {
      id: 'bid-1',
      rfq_id: 'RFQ-1',
      supplier_id: 'sup-a',
      supplier_name: '供应商A',
      total_price: 90000,
      lead_days: 14,
      warranty_months: 24,
      proposal_note: '原厂直供',
      item_prices_json: '[]',
      is_winner: 0,
      submitted_at: '2026-11-01T10:00:00Z',
      fulfillment_rate: 98.5,
    },
    {
      id: 'bid-2',
      rfq_id: 'RFQ-1',
      supplier_id: 'sup-b',
      supplier_name: '供应商B',
      total_price: 105000,
      lead_days: 20,
      warranty_months: 12,
      proposal_note: '标准交付',
      item_prices_json: '[]',
      is_winner: 0,
      submitted_at: '2026-11-01T11:00:00Z',
      fulfillment_rate: 95,
    },
  ];

  it('computes full composite scores and savings for BUYER', () => {
    const ranked = evaluateAndRankBids(sampleBids, 100000, 'BUYER', 'buyer-caojie');
    expect(ranked).toHaveLength(2);
    expect(ranked[0].supplierId).toBe('sup-a');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].savingsAmount).toBe(10000);
    expect(ranked[0].savingsRate).toBe(10);
    expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore!);
    expect(ranked[1].priceScore).toBeLessThan(85); // budget penalty applied (>100000)
  });

  it('masks competitor prices and details for SUPPLIER viewer', () => {
    const ranked = evaluateAndRankBids(sampleBids, 100000, 'SUPPLIER', 'sup-b');
    const maskedCompetitor = ranked.find((b) => b.id === 'bid-1')!;
    const ownBid = ranked.find((b) => b.id === 'bid-2')!;
    expect(maskedCompetitor.isMasked).toBe(true);
    expect(maskedCompetitor.totalPrice).toBe(0);
    expect(ownBid.isMasked).toBe(false);
    expect(ownBid.isOwn).toBe(true);
    expect(ownBid.totalPrice).toBe(105000);
  });
});
