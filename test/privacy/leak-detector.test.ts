import { detectLeaks } from '../../src/privacy/leak-detector';

describe('detectLeaks', () => {
  it('detects emails and phone numbers', () => {
    const text = 'Contact me at alice@example.com or +1-202-555-0148';
    const result = detectLeaks(text);
    const types = result.entities.map((e) => e.type);
    expect(types).toContain('EMAIL');
    expect(types).toContain('PHONE');
    expect(result.sensitivity).toBeGreaterThan(0);
  });

  it('detects API keys and JWT tokens', () => {
    const text =
      'sk-abcdef1234567890 and token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature';
    const result = detectLeaks(text);
    const types = result.entities.map((e) => e.type);
    expect(types).toContain('API_KEY');
    expect(types).toContain('ACCESS_TOKEN');
  });

  it('detects credit cards using luhn check', () => {
    const text = 'My card is 4242 4242 4242 4242 please keep safe.';
    const result = detectLeaks(text);
    expect(result.entities.find((e) => e.type === 'CREDIT_CARD')).toBeTruthy();
  });

  it('ignores invalid credit card numbers', () => {
    const text = 'Fake card 1234 1234 1234 1234.';
    const result = detectLeaks(text);
    expect(result.entities.find((e) => e.type === 'CREDIT_CARD')).toBeFalsy();
  });

  it('detects private key blocks', () => {
    const text = `-----BEGIN PRIVATE KEY-----
MIIBVgIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAz1
-----END PRIVATE KEY-----`;
    const result = detectLeaks(text);
    expect(result.entities.find((e) => e.type === 'PRIVATE_KEY')).toBeTruthy();
  });

  it('prefers credit card over phone for overlapping digits', () => {
    const text = 'number 4242 4242 4242 4242 please secure';
    const result = detectLeaks(text);
    const types = result.entities.map((e) => e.type);
    expect(types).toContain('CREDIT_CARD');
    expect(types).not.toContain('PHONE');
  });
});
