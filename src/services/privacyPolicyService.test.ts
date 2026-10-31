import { fetchPrivacyPolicyText, PRIVACY_POLICY_URL } from './privacyPolicyService';

describe('fetchPrivacyPolicyText', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches the privacy policy URL and returns its content as plain text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html><body><p>Our policy</p></body></html>'),
    }) as unknown as typeof fetch;

    const result = await fetchPrivacyPolicyText();

    expect(global.fetch).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    expect(result).toBe('Our policy');
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    await expect(fetchPrivacyPolicyText()).rejects.toThrow();
  });

  it('propagates a network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;

    await expect(fetchPrivacyPolicyText()).rejects.toThrow('Network request failed');
  });
});
