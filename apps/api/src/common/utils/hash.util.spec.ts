import { hashBuffer, hashString } from './hash.util';

// Reference SHA-256 of the ASCII string "hello":
const HELLO_SHA256 =
  '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

describe('hash.util', () => {
  it('hashString returns the known sha256 hex of a fixed input', () => {
    expect(hashString('hello')).toBe(HELLO_SHA256);
  });

  it('hashBuffer matches hashString for the same bytes', () => {
    expect(hashBuffer(Buffer.from('hello', 'utf8'))).toBe(HELLO_SHA256);
  });
});
