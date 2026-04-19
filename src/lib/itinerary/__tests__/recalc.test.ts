import { recalculateDay } from '../recalc';

describe('recalculateDay', () => {
  it('returns 0 for empty entries', () => {
    const result = recalculateDay({
      dayNumber: 1,
      entries: [],
      estimatedDailySpendGBP: 999,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(0);
  });

  it('calculates basic summation of whole number costs', () => {
    const result = recalculateDay({
      dayNumber: 2,
      entries: [
        { estimatedCostGBP: 10 },
        { estimatedCostGBP: 20 },
        { estimatedCostGBP: 5 }
      ],
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(35);
  });

  it('handles floating point costs (£12.50 + £7.99) without float drift', () => {
    const result = recalculateDay({
      dayNumber: 2,
      entries: [
        { estimatedCostGBP: 12.50 },
        { estimatedCostGBP: 7.99 }
      ],
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(20.49);
  });

  it('treats zero cost entries as 0 not NaN', () => {
    const result = recalculateDay({
      dayNumber: 2,
      entries: [
        { estimatedCostGBP: 0 },
        { estimatedCostGBP: 10 }
      ],
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(10);
  });

  it('treats undefined estimatedCostGBP as 0', () => {
    const result = recalculateDay({
      dayNumber: 2,
      entries: [
        { estimatedCostGBP: undefined },
        { estimatedCostGBP: 15 }
      ],
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(15);
  });

  it('handles single entry array (edge case)', () => {
    const result = recalculateDay({
      dayNumber: 2,
      entries: [
        { estimatedCostGBP: 42.5 }
      ],
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(42.5);
  });

  it('handles array of 20 entries with no accumulation errors', () => {
    const entries = Array.from({ length: 20 }).map(() => ({ estimatedCostGBP: 0.1 }));
    const result = recalculateDay({
      dayNumber: 2,
      entries,
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(2);
  });

  it('handles mixed entries: some have cost, some undefined, some 0', () => {
    const result = recalculateDay({
      dayNumber: 2,
      entries: [
        { estimatedCostGBP: 10.25 },
        { estimatedCostGBP: undefined },
        { estimatedCostGBP: 0 },
        { estimatedCostGBP: 5.75 }
      ],
      estimatedDailySpendGBP: 0,
    } as any);
    expect(result.estimatedDailySpendGBP).toBe(16);
  });
});
