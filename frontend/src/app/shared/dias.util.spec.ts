import { normalizeDia } from './dias.util';

describe('normalizeDia', () => {
  it('normalizes accented weekday names', () => {
    expect(normalizeDia('terça')).toBe('terca');
    expect(normalizeDia('TERÇA')).toBe('terca');
    expect(normalizeDia('Quinta')).toBe('quinta');
  });
});
