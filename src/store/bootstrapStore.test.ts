import { initDatabase } from '../db/database';
import { useBootstrapStore } from './bootstrapStore';

jest.mock('../db/database', () => ({
  initDatabase: jest.fn(),
}));

const initDatabaseMock = initDatabase as jest.MockedFunction<typeof initDatabase>;
const fakeDatabase = {} as never;

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  initDatabaseMock.mockResolvedValue(fakeDatabase);
  useBootstrapStore.setState({ status: 'loading', error: null });
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('bootstrapStore', () => {
  it('starts in the loading status with no error', () => {
    expect(useBootstrapStore.getState().status).toBe('loading');
    expect(useBootstrapStore.getState().error).toBeNull();
  });
});

describe('initialize', () => {
  it('moves to ready when the database initializes', async () => {
    await useBootstrapStore.getState().initialize();

    expect(initDatabaseMock).toHaveBeenCalledTimes(1);
    expect(useBootstrapStore.getState().status).toBe('ready');
    expect(useBootstrapStore.getState().error).toBeNull();
  });

  it('moves to error and records the message when initialization fails', async () => {
    initDatabaseMock.mockRejectedValueOnce(new Error('unable to open database file'));

    await useBootstrapStore.getState().initialize();

    expect(useBootstrapStore.getState().status).toBe('error');
    expect(useBootstrapStore.getState().error).toBe('unable to open database file');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('stringifies a non-Error rejection instead of dropping it', async () => {
    initDatabaseMock.mockRejectedValueOnce('disk is full');

    await useBootstrapStore.getState().initialize();

    expect(useBootstrapStore.getState().status).toBe('error');
    expect(useBootstrapStore.getState().error).toBe('disk is full');
  });

  it('runs initDatabase only once when called twice concurrently', async () => {
    let resolveInit: (db: never) => void = () => {};
    initDatabaseMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInit = resolve;
      }),
    );

    const first = useBootstrapStore.getState().initialize();
    const second = useBootstrapStore.getState().initialize();
    resolveInit(fakeDatabase);
    await Promise.all([first, second]);

    expect(initDatabaseMock).toHaveBeenCalledTimes(1);
    expect(useBootstrapStore.getState().status).toBe('ready');
  });
});

describe('retry', () => {
  it('returns to loading and then to ready when initialization succeeds', async () => {
    initDatabaseMock.mockRejectedValueOnce(new Error('boom'));
    await useBootstrapStore.getState().initialize();
    expect(useBootstrapStore.getState().status).toBe('error');

    let resolveInit: (db: never) => void = () => {};
    initDatabaseMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInit = resolve;
      }),
    );

    const pending = useBootstrapStore.getState().retry();
    expect(useBootstrapStore.getState().status).toBe('loading');
    expect(useBootstrapStore.getState().error).toBeNull();

    resolveInit(fakeDatabase);
    await pending;

    expect(useBootstrapStore.getState().status).toBe('ready');
    expect(useBootstrapStore.getState().error).toBeNull();
  });

  it('returns to error and stays retryable when initialization fails again', async () => {
    initDatabaseMock.mockRejectedValueOnce(new Error('first failure'));
    await useBootstrapStore.getState().initialize();

    initDatabaseMock.mockRejectedValueOnce(new Error('second failure'));
    await useBootstrapStore.getState().retry();

    expect(useBootstrapStore.getState().status).toBe('error');
    expect(useBootstrapStore.getState().error).toBe('second failure');
    expect(typeof useBootstrapStore.getState().retry).toBe('function');

    await useBootstrapStore.getState().retry();

    expect(useBootstrapStore.getState().status).toBe('ready');
  });

  it('runs initDatabase only once when retried twice in a row', async () => {
    initDatabaseMock.mockRejectedValueOnce(new Error('boom'));
    await useBootstrapStore.getState().initialize();
    initDatabaseMock.mockClear();

    let resolveInit: (db: never) => void = () => {};
    initDatabaseMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInit = resolve;
      }),
    );

    const first = useBootstrapStore.getState().retry();
    const second = useBootstrapStore.getState().retry();
    resolveInit(fakeDatabase);
    await Promise.all([first, second]);

    expect(initDatabaseMock).toHaveBeenCalledTimes(1);
    expect(useBootstrapStore.getState().status).toBe('ready');
  });
});
