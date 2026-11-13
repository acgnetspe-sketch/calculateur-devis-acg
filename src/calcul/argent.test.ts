import { describe, expect, it } from 'vitest';
import { arrondir, eurosEnCentimes, formatEuros, formatNombre, lireMontant, lireNombre, pourcentage } from './argent';

const nb = ' ';

describe('arrondi commercial', () => {
  it('arrondit 0,5 au-dessus', () => {
    expect(arrondir(2.5)).toBe(3);
    expect(arrondir(65_953.75)).toBe(65_954);
    expect(arrondir(250_624.2)).toBe(250_624);
    expect(arrondir(-2.5)).toBe(-3);
  });
  it('ignore les erreurs de virgule', () => {
    expect(arrondir(1.005 * 100)).toBe(101); // 100,49999… en machine
    expect(eurosEnCentimes(0.29)).toBe(29); // 28,999… en machine
    expect(eurosEnCentimes(1325)).toBe(132_500);
  });
  it('calcule un pourcentage au centime', () => {
    expect(pourcentage(1_319_075, 20)).toBe(263_815);
    expect(pourcentage(1000, 5.5)).toBe(55);
  });
});

describe('formats français', () => {
  it('affiche les montants « 1 234,56 € »', () => {
    expect(formatEuros(123_456)).toBe(`1${nb}234,56${nb}€`);
    expect(formatEuros(5)).toBe(`0,05${nb}€`);
    expect(formatEuros(1_582_890)).toBe(`15${nb}828,90${nb}€`);
    expect(formatEuros(123_456_789)).toBe(`1${nb}234${nb}567,89${nb}€`);
    expect(formatEuros(-65_954)).toBe(`-659,54${nb}€`);
  });
  it('affiche les nombres', () => {
    expect(formatNombre(52_763)).toBe(`52${nb}763`);
    expect(formatNombre(12.5)).toBe('12,5');
    expect(formatNombre(26.3815, 1)).toBe('26,4');
  });
  it('lit les saisies françaises', () => {
    expect(lireNombre('1 234,56')).toBe(1234.56);
    expect(lireNombre('0.25')).toBe(0.25);
    expect(lireNombre('abc')).toBeNull();
    expect(lireNombre('')).toBeNull();
    expect(lireMontant('0,25 €')).toBe(25);
    expect(lireMontant('1 325')).toBe(132_500);
  });
});
