import type { WarrantyItem } from '../types/warranty';
import {
  WARRANTY_ATTENTION_LIMIT,
  getAttentionStatusFilter,
  summarizeWarrantyAttention,
} from './warrantyAttention';

const today = new Date(2025, 5, 15); // 15 Jun 2025

function makeItem(overrides: Partial<WarrantyItem> = {}): WarrantyItem {
  const item: WarrantyItem = {
    id: overrides.id ?? 'id-1',
    name: overrides.name ?? 'Item',
    purchaseDate: '2024-01-01',
    warrantyMonths: 12,
    expiryDate: overrides.coverageEndDate ?? '2025-01-01',
    category: overrides.category,
    invoiceDocuments: [],
    warrantyDocuments: [],
    extendedWarranties: [],
    coverageEndDate: '2025-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };

  return { ...item, coverageEndDate: overrides.coverageEndDate ?? item.expiryDate };
}

// Named by how they read on 15 Jun 2025, so the ordering expectations stay legible.
const expired6 = makeItem({ id: 'e6', name: 'Dell Laptop', coverageEndDate: '2025-06-09' });
const expired12 = makeItem({ id: 'e12', name: 'Canon EOS R50', coverageEndDate: '2025-06-03' });
const expired20 = makeItem({ id: 'e20', name: 'Washing Machine', coverageEndDate: '2025-05-26' });
const expiring12 = makeItem({ id: 'x12', name: 'Sofa', coverageEndDate: '2025-06-27' });
const expiring18 = makeItem({ id: 'x18', name: 'LG 55" TV', coverageEndDate: '2025-07-03' });
const active = makeItem({ id: 'a1', name: 'Fridge', coverageEndDate: '2026-01-01' });

describe('summarizeWarrantyAttention', () => {
  it('reports the empty state when there are no items at all', () => {
    expect(summarizeWarrantyAttention([], today)).toEqual({
      state: 'empty',
      expiredCount: 0,
      expiringCount: 0,
      attentionCount: 0,
      items: [],
    });
  });

  it('reports the caught-up state when every item is still active', () => {
    expect(summarizeWarrantyAttention([active, makeItem({ id: 'a2', coverageEndDate: '2027-03-01' })], today)).toEqual({
      state: 'caughtUp',
      expiredCount: 0,
      expiringCount: 0,
      attentionCount: 0,
      items: [],
    });
  });

  it('lists expired items most recently expired first', () => {
    const summary = summarizeWarrantyAttention([expired20, expired6, expired12, active], today);

    expect(summary.state).toBe('needsAttention');
    expect(summary.expiredCount).toBe(3);
    expect(summary.expiringCount).toBe(0);
    expect(summary.attentionCount).toBe(3);
    expect(summary.items.map((item) => item.id)).toEqual(['e6', 'e12', 'e20']);
  });

  it('lists expiring-soon items soonest first', () => {
    const summary = summarizeWarrantyAttention([expiring18, expiring12, active], today);

    expect(summary.state).toBe('needsAttention');
    expect(summary.expiredCount).toBe(0);
    expect(summary.expiringCount).toBe(2);
    expect(summary.items.map((item) => item.id)).toEqual(['x12', 'x18']);
  });

  it('puts every expired item ahead of the expiring-soon ones', () => {
    const summary = summarizeWarrantyAttention([expiring12, expired12, expiring18, expired6], today);

    expect(summary.expiredCount).toBe(2);
    expect(summary.expiringCount).toBe(2);
    expect(summary.attentionCount).toBe(4);
    expect(summary.items.map((item) => item.id)).toEqual(['e6', 'e12', 'x12']);
  });

  it('returns every item when fewer than the limit need attention', () => {
    const summary = summarizeWarrantyAttention([active, expired6, expiring12], today);

    expect(summary.items.map((item) => item.id)).toEqual(['e6', 'x12']);
  });

  it('caps the list at three while still counting all of them', () => {
    const summary = summarizeWarrantyAttention(
      [expired6, expired12, expired20, expiring12, expiring18],
      today
    );

    expect(summary.items).toHaveLength(WARRANTY_ATTENTION_LIMIT);
    expect(summary.items.map((item) => item.id)).toEqual(['e6', 'e12', 'e20']);
    expect(summary.attentionCount).toBe(5);
  });

  it('breaks ties by name, then id', () => {
    const sameDay = [
      makeItem({ id: 'z', name: 'Blender', coverageEndDate: '2025-06-09' }),
      makeItem({ id: 'b', name: 'Amplifier', coverageEndDate: '2025-06-09' }),
      makeItem({ id: 'a', name: 'Blender', coverageEndDate: '2025-06-09' }),
    ];

    expect(summarizeWarrantyAttention(sameDay, today).items.map((item) => item.id)).toEqual(['b', 'a', 'z']);
  });

  it('does not mutate the input list', () => {
    const input = [expiring12, expired12, expired6];
    const copy = [...input];

    summarizeWarrantyAttention(input, today);

    expect(input).toEqual(copy);
  });
});

describe('getAttentionStatusFilter', () => {
  it('points at the expired filter when only expired items need attention', () => {
    expect(getAttentionStatusFilter(summarizeWarrantyAttention([expired6], today))).toBe('expired');
  });

  it('points at the expiring filter when only expiring items need attention', () => {
    expect(getAttentionStatusFilter(summarizeWarrantyAttention([expiring12], today))).toBe('expiring');
  });

  it('prefers the more urgent expired filter when both are present', () => {
    expect(getAttentionStatusFilter(summarizeWarrantyAttention([expiring12, expired6], today))).toBe('expired');
  });

  it('has no destination when nothing needs attention', () => {
    expect(getAttentionStatusFilter(summarizeWarrantyAttention([active], today))).toBeNull();
    expect(getAttentionStatusFilter(summarizeWarrantyAttention([], today))).toBeNull();
  });
});
