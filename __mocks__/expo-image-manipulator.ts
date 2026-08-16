/**
 * Jest manual mock for `expo-image-manipulator`. Simulates the contextual
 * manipulate().renderAsync()/resize()/saveAsync() API against an in-memory
 * "source image size" so tests can control dimensions and force failures
 * without needing the native module.
 */
type Size = { width: number; height: number };

let mockSourceSize: Size = { width: 800, height: 600 };
let shouldFail = false;

export function __setMockImageSize(size: Size): void {
  mockSourceSize = size;
}

export function __setManipulateShouldFail(fail: boolean): void {
  shouldFail = fail;
}

export function __resetImageManipulatorMock(): void {
  mockSourceSize = { width: 800, height: 600 };
  shouldFail = false;
}

export enum SaveFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
}

export type SaveOptions = { compress?: number; format?: SaveFormat };

class MockImageRef {
  constructor(
    public uri: string,
    public width: number,
    public height: number
  ) {}

  async saveAsync(options: SaveOptions = {}): Promise<{ uri: string; width: number; height: number }> {
    if (shouldFail) {
      throw new Error('mock image manipulation failure');
    }
    return {
      uri: `file:///mock-cache/compressed-${this.width}x${this.height}-q${options.compress}.jpg`,
      width: this.width,
      height: this.height,
    };
  }

  release(): void {}
}

class MockContext {
  private resizeTarget: { width?: number; height?: number } | null = null;

  constructor(private sourceUri: string) {}

  resize(size: { width?: number; height?: number }): MockContext {
    this.resizeTarget = size;
    return this;
  }

  reset(): MockContext {
    this.resizeTarget = null;
    return this;
  }

  async renderAsync(): Promise<MockImageRef> {
    if (shouldFail) {
      throw new Error('mock image manipulation failure');
    }
    if (!this.resizeTarget) {
      return new MockImageRef(this.sourceUri, mockSourceSize.width, mockSourceSize.height);
    }

    const { width: origWidth, height: origHeight } = mockSourceSize;
    let { width, height } = this.resizeTarget;
    if (width && !height) {
      height = Math.round((origHeight / origWidth) * width);
    } else if (height && !width) {
      width = Math.round((origWidth / origHeight) * height);
    }
    return new MockImageRef(this.sourceUri, width!, height!);
  }

  release(): void {}
}

export const ImageManipulator = {
  manipulate: jest.fn((uri: string) => new MockContext(uri)),
};

declare module 'expo-image-manipulator' {
  export function __setMockImageSize(size: Size): void;
  export function __setManipulateShouldFail(fail: boolean): void;
  export function __resetImageManipulatorMock(): void;
}
