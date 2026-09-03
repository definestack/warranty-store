import Constants from 'expo-constants';

import { getAppVersionInfo } from './appVersion';

jest.mock('expo-constants', () => ({ expoConfig: null }));

describe('getAppVersionInfo', () => {
  it('returns the versionName and stringified versionCode when both are present', () => {
    (Constants as { expoConfig: unknown }).expoConfig = {
      version: '0.5.2',
      android: { versionCode: 262610002 },
    };

    expect(getAppVersionInfo()).toEqual({ versionName: '0.5.2', buildNumber: '262610002' });
  });

  it('falls back to an em dash when expoConfig.version is missing', () => {
    (Constants as { expoConfig: unknown }).expoConfig = {
      android: { versionCode: 262610002 },
    };

    expect(getAppVersionInfo().versionName).toBe('—');
  });

  it('falls back to an em dash when android.versionCode is missing', () => {
    (Constants as { expoConfig: unknown }).expoConfig = { version: '0.5.2' };

    expect(getAppVersionInfo().buildNumber).toBe('—');
  });

  it('falls back to an em dash for both fields when expoConfig is null', () => {
    (Constants as { expoConfig: unknown }).expoConfig = null;

    expect(getAppVersionInfo()).toEqual({ versionName: '—', buildNumber: '—' });
  });
});
