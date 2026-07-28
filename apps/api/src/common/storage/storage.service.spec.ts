import type { AppConfigService } from '../../config/app-config.service';
import { LocalStorageProvider } from './local-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { StorageService } from './storage.service';

/**
 * Driver selection is the whole job of this class, and getting it wrong is the
 * kind of bug that does not announce itself: the app keeps working while assets
 * land somewhere nobody is looking — the local disk of a container that is about
 * to be replaced, or a production bucket during a local run.
 */
describe('StorageService driver selection', () => {
  const config = (
    overrides: Partial<{
      storageDriver: string;
      assetStorageRoot: string;
      r2Config: unknown;
    }>,
  ) => overrides as unknown as AppConfigService;

  it('uses R2 when the driver is r2', () => {
    const service = new StorageService(
      config({
        storageDriver: 'r2',
        r2Config: {
          bucket: 'certiva',
          endpoint: 'https://example.r2.cloudflarestorage.com',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
          forcePathStyle: true,
        },
      }),
    );

    service.onModuleInit();

    expect(service['provider']).toBeInstanceOf(R2StorageProvider);
  });

  it('uses the local disk for any other driver', () => {
    const service = new StorageService(
      config({ storageDriver: 'local', assetStorageRoot: '/tmp/certiva-test' }),
    );

    service.onModuleInit();

    expect(service['provider']).toBeInstanceOf(LocalStorageProvider);
  });

  it('does not fall through to R2 when the driver is unset', () => {
    // An unset driver must mean local, never the remote bucket: defaulting the
    // other way would make a misconfigured deployment write to real storage.
    const service = new StorageService(
      config({
        storageDriver: undefined,
        assetStorageRoot: '/tmp/certiva-test',
      }),
    );

    service.onModuleInit();

    expect(service['provider']).toBeInstanceOf(LocalStorageProvider);
  });

  it('forwards every operation to the chosen provider untouched', async () => {
    const service = new StorageService(
      config({ storageDriver: 'local', assetStorageRoot: '/tmp/certiva-test' }),
    );
    const provider = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(Buffer.from('body')),
      getText: jest.fn().mockResolvedValue('body'),
      exists: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(undefined),
      deletePrefix: jest.fn().mockResolvedValue(undefined),
    };
    service['provider'] = provider;

    await service.put('a/b.pdf', Buffer.from('x'), 'application/pdf');
    await service.get('a/b.pdf');
    await service.getText('a/meta.json');
    await service.exists('a/b.pdf');
    await service.delete('a/b.pdf');
    await service.deletePrefix('a/');

    expect(provider.put).toHaveBeenCalledWith(
      'a/b.pdf',
      Buffer.from('x'),
      'application/pdf',
    );
    expect(provider.get).toHaveBeenCalledWith('a/b.pdf');
    expect(provider.getText).toHaveBeenCalledWith('a/meta.json');
    expect(provider.exists).toHaveBeenCalledWith('a/b.pdf');
    expect(provider.delete).toHaveBeenCalledWith('a/b.pdf');
    expect(provider.deletePrefix).toHaveBeenCalledWith('a/');
  });
});
