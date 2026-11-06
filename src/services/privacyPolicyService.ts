import { stripHtmlToText } from '../utils/html';

export const PRIVACY_POLICY_URL = 'https://www.dstack.in/apps/warrantystore/privacypolicy';

/** Fetches the hosted privacy policy page and renders it as plain text. */
export async function fetchPrivacyPolicyText(): Promise<string> {
  const response = await fetch(PRIVACY_POLICY_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch privacy policy (status ${response.status})`);
  }
  const html = await response.text();
  return stripHtmlToText(html);
}
