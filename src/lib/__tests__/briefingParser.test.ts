import { parseBriefingSemantics } from '../briefingParser';

describe('parseBriefingSemantics', () => {
  it('handles all fields fully populated returning correct union type values', () => {
    const result = parseBriefingSemantics({
      tapWater: 'Safe to drink',
      airportTransit: 'Metro is best',
      englishProficiency: 'Fluent English widely spoken',
      tippingEtiquette: '10 percent is customary'
    });
    
    expect(result).toEqual({
      tapWaterStatus: 'SAFE',
      primaryTransit: 'PUBLIC',
      languageBarrier: 'LOW',
      tippingNorm: 'PERCENTAGE'
    });
  });

  it('handles all fields undefined returning UNKNOWN/MIXED fallbacks without throwing', () => {
    expect(() => {
      const result = parseBriefingSemantics({});
      expect(result).toEqual({
        tapWaterStatus: 'UNKNOWN',
        primaryTransit: 'MIXED',
        languageBarrier: 'UNKNOWN',
        tippingNorm: 'UNKNOWN'
      });
    }).not.toThrow();
  });

  it('handles partial data with some populated and some undefined', () => {
    const result = parseBriefingSemantics({
      tapWater: 'Do not drink',
      englishProficiency: 'rarely spoken'
    });
    
    expect(result).toEqual({
      tapWaterStatus: 'UNSAFE',
      primaryTransit: 'MIXED',
      languageBarrier: 'HIGH',
      tippingNorm: 'UNKNOWN'
    });
  });

  it('handles unexpected string values without throwing and returns UNKNOWN', () => {
    const result = parseBriefingSemantics({
      tapWater: 'it depends',
      tippingEtiquette: 'whenever you feel like it'
    });
    
    expect(result.tapWaterStatus).toBe('UNKNOWN');
    expect(result.tippingNorm).toBe('UNKNOWN');
  });

  it('treats empty string "" same as undefined', () => {
    const result = parseBriefingSemantics({
      tapWater: '',
      airportTransit: '',
      englishProficiency: '',
      tippingEtiquette: ''
    });
    
    expect(result).toEqual({
      tapWaterStatus: 'UNKNOWN',
      primaryTransit: 'MIXED',
      languageBarrier: 'UNKNOWN',
      tippingNorm: 'UNKNOWN'
    });
  });

  it('is case insensitive', () => {
    expect(parseBriefingSemantics({ tapWater: 'safe' }).tapWaterStatus).toBe('SAFE');
    expect(parseBriefingSemantics({ tapWater: 'SAFE' }).tapWaterStatus).toBe('SAFE');
    expect(parseBriefingSemantics({ tapWater: 'Safe' }).tapWaterStatus).toBe('SAFE');
  });

  it('handles whitespace gracefully', () => {
    const result = parseBriefingSemantics({
      tapWater: '  safe  ',
      airportTransit: '\n metro \t',
      englishProficiency: '   fluent   ',
      tippingEtiquette: '  percentage  '
    });
    
    expect(result).toEqual({
      tapWaterStatus: 'SAFE',
      primaryTransit: 'PUBLIC',
      languageBarrier: 'LOW',
      tippingNorm: 'PERCENTAGE'
    });
  });
});
