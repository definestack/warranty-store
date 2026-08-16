/**
 * Jest manual mock for `expo-image-picker`. The real module delegates to a
 * native module that jest-expo stubs out to no-ops, so permission/launch
 * calls would otherwise resolve to `undefined`. Tests override these with
 * `mockResolvedValueOnce`/`mockReturnValueOnce` as needed.
 */
export const requestCameraPermissionsAsync = jest.fn(async () => ({ granted: true }));

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({ granted: true }));

export const launchCameraAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: 'file:///mock-camera/photo.jpg' }],
}));

export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: 'file:///mock-gallery/photo.jpg' }],
}));
