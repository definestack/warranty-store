import Constants from 'expo-constants';

const UNKNOWN = '—';

export interface AppVersionInfo {
  versionName: string;
  buildNumber: string;
}

export function getAppVersionInfo(): AppVersionInfo {
  const config = Constants.expoConfig;
  const versionName = config?.version ?? UNKNOWN;
  const versionCode = config?.android?.versionCode;

  return {
    versionName,
    buildNumber: versionCode != null ? String(versionCode) : UNKNOWN,
  };
}
