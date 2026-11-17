import { describe, it, expect } from 'vitest';
import { CANON } from './canon-tokens';

describe('CANON Design Tokens', () => {
  it('should have all required color tokens', () => {
    expect(CANON.colors.black).toBe('#050505');
    expect(CANON.colors.neonRed).toBe('#FF073A');
    expect(CANON.colors.gold).toBe('#D4AF37');
    expect(CANON.colors.cyan).toBe('#4de8e0');
    expect(CANON.colors.violet.from).toBe('#7A2BFF');
    expect(CANON.colors.violet.to).toBe('#9B5CFF');
  });

  it('should have spacing tokens', () => {
    expect(CANON.spacing.xs).toBe('4px');
    expect(CANON.spacing.md).toBe('16px');
    expect(CANON.spacing.xl).toBe('32px');
  });

  it('should have typography tokens', () => {
    expect(CANON.typography.fontFamily.sans).toContain('Sora');
    expect(CANON.typography.fontFamily.mono).toContain('JetBrains Mono');
  });

  it('should have shadow tokens including glows', () => {
    expect(CANON.shadows.glow).toContain('rgba(122, 43, 255');
    expect(CANON.shadows.glowRed).toContain('rgba(255, 7, 58');
    expect(CANON.shadows.glowGold).toContain('rgba(212, 175, 55');
  });

  it('should have violet gradient definition', () => {
    expect(CANON.colors.violet.gradient).toContain('linear-gradient');
    expect(CANON.colors.violet.gradient).toContain('#7A2BFF');
    expect(CANON.colors.violet.gradient).toContain('#9B5CFF');
  });
});
