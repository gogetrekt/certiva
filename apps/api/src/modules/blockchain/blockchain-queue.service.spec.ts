// Both are mocked so the constructor opens no sockets at all: BullMQ's `Queue`
// builds its own Redis connection eagerly, which otherwise emits connection
// errors through the whole run and leaves a handle behind.
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  })),
}));

import IORedis from 'ioredis';

import type { AppConfigService } from '../../config/app-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ANCHOR_STATUS,
  BLOCKCHAIN_JOB_NAMES,
  BLOCKCHAIN_OPERATION,
  CHAIN_STATUS,
} from './blockchain.constants';
import { BlockchainQueueService } from './blockchain-queue.service';

/**
 * What matters here is retry and idempotency, and both live in details that are
 * easy to break silently: the job id, and the fact that the database row and the
 * lifecycle log are written in one transaction. A non-deterministic job id would
 * let the same credential be anchored twice — an on-chain write that cannot be
 * undone.
 *
 * `bullmq` and `ioredis` are mocked at the top of the file, so the constructor
 * opens nothing and these stay unit tests.
 */
describe('BlockchainQueueService', () => {
  type Mock = jest.MockedFunction<(input: unknown) => Promise<unknown>>;
  type Tx = {
    credential: { update: Mock };
    blockchainAnchorLog: { create: Mock };
  };

  // Read the mock out of the double instead of writing `expect(tx.a.b)`, which
  // eslint reads as an unbound method reference.
  const create = (tx: Tx): Mock => tx.blockchainAnchorLog.create;
  /** `expect.objectContaining` is typed `any`; this keeps that out of the literal. */
  const containing = (shape: Record<string, unknown>): unknown =>
    expect.objectContaining(shape);
  const update = (tx: Tx): Mock => tx.credential.update;

  const build = () => {
    const tx = {
      credential: { update: jest.fn() as Mock },
      blockchainAnchorLog: { create: jest.fn() as Mock },
    };
    tx.credential.update.mockResolvedValue({});
    tx.blockchainAnchorLog.create.mockResolvedValue({});
    const transaction = jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;

    const service = new BlockchainQueueService(
      { redisUrl: 'redis://127.0.0.1:6379' } as unknown as AppConfigService,
      prisma,
    );

    const queue = {
      add: jest.fn() as jest.MockedFunction<
        (
          name: string,
          payload: { credentialId: string; operation: string },
          opts: { jobId: string },
        ) => Promise<unknown>
      >,
      close: jest.fn(),
    };
    queue.add.mockResolvedValue({});
    // `queue` is readonly on the class; replacing it is the point of the double.
    (service as unknown as { queue: unknown }).queue = queue;
    built.push(service);

    return { service, queue, tx, transaction };
  };

  const built: BlockchainQueueService[] = [];

  afterEach(() => {
    built.splice(0);
    jest.clearAllMocks();
  });

  /**
   * The producer connection used maxRetriesPerRequest: null and left
   * enableOfflineQueue at its default of true. With Redis down, queue.add()
   * parked the command in ioredis' in-memory offline queue and never settled,
   * so the request hung rather than failing — and every
   * catch { markQueueFailure(...) } around an enqueue, including the
   * REVOKE_ENQUEUE_FAILED path, was unreachable in the failure mode most
   * likely to happen. BullMQ needs maxRetriesPerRequest: null on a *Worker*
   * connection; on the producer side, failing fast is what is wanted.
   */
  it('opens the producer connection in fail-fast mode', () => {
    build();

    const ctor = IORedis as unknown as jest.Mock<
      unknown,
      [string, Record<string, unknown>]
    >;
    const options = ctor.mock.calls[0][1] as {
      enableOfflineQueue?: boolean;
      connectTimeout?: number;
      maxRetriesPerRequest?: number | null;
    };

    expect(options.enableOfflineQueue).toBe(false);
    expect(options.maxRetriesPerRequest).not.toBeNull();
    expect(typeof options.connectTimeout).toBe('number');
  });

  it('derives the anchor job id from the credential, so a repeat enqueue collapses', async () => {
    const { service, queue } = build();

    await service.enqueueAnchor('cred_123');
    await service.enqueueAnchor('cred_123');

    const first = queue.add.mock.calls[0];
    const second = queue.add.mock.calls[1];
    expect(first[2].jobId).toBe(`${BLOCKCHAIN_JOB_NAMES.anchor}-cred_123`);
    expect(second[2].jobId).toBe(first[2].jobId);
  });

  it('keeps anchor and revoke job ids apart for the same credential', async () => {
    // Sharing an id would make a revoke silently dropped as a duplicate of the
    // earlier anchor, leaving the credential live on chain.
    const { service, queue } = build();

    await service.enqueueAnchor('cred_123');
    await service.enqueueRevoke('cred_123');

    expect(queue.add.mock.calls[0][2].jobId).toBe(
      `${BLOCKCHAIN_JOB_NAMES.anchor}-cred_123`,
    );
    expect(queue.add.mock.calls[1][2].jobId).toBe(
      `${BLOCKCHAIN_JOB_NAMES.revoke}-cred_123`,
    );
  });

  it('enqueues the operation the worker branches on', async () => {
    const { service, queue } = build();

    await service.enqueueAnchor('cred_123');
    await service.enqueueRevoke('cred_456');

    expect(queue.add.mock.calls[0][1]).toEqual({
      credentialId: 'cred_123',
      operation: BLOCKCHAIN_OPERATION.anchor,
    });
    expect(queue.add.mock.calls[1][1]).toEqual({
      credentialId: 'cred_456',
      operation: BLOCKCHAIN_OPERATION.revoke,
    });
  });

  it('writes the pending lifecycle row inside a transaction, before enqueueing', async () => {
    const { service, transaction, tx } = build();

    await service.enqueueAnchor('cred_123');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create(tx)).toHaveBeenCalledWith({
      data: containing({
        credentialId: 'cred_123',
        operation: BLOCKCHAIN_OPERATION.anchor,
        status: ANCHOR_STATUS.pending,
        attempts: 0,
      }),
    });
  });

  it('records an anchor enqueue failure as FAILED on the credential and the log', async () => {
    const { service, tx } = build();

    await service.markQueueFailure(
      'cred_123',
      BLOCKCHAIN_OPERATION.anchor,
      'redis unreachable',
    );

    expect(update(tx)).toHaveBeenCalledWith({
      where: { id: 'cred_123' },
      data: {
        anchorStatus: ANCHOR_STATUS.failed,
        chainStatus: ANCHOR_STATUS.failed,
      },
    });
    expect(create(tx)).toHaveBeenCalledWith({
      data: containing({
        status: ANCHOR_STATUS.failed,
        errorMessage: 'redis unreachable',
      }),
    });
  });

  it('records a revoke enqueue failure as REVOKE_ENQUEUE_FAILED, not REVOKE_FAILED', async () => {
    // The distinction is the whole point of the status. REVOKE_FAILED means the
    // worker picked the job up and every on-chain attempt failed; this branch
    // means the job never got queued, so nothing was attempted. Leaving it as
    // ANCHORED — what this used to do — reads as a healthy credential.
    const { service, tx } = build();

    await service.markQueueFailure(
      'cred_123',
      BLOCKCHAIN_OPERATION.revoke,
      'redis unreachable',
    );

    expect(update(tx)).toHaveBeenCalledWith({
      where: { id: 'cred_123' },
      data: { chainStatus: CHAIN_STATUS.revokeEnqueueFailed },
    });
    expect(create(tx)).toHaveBeenCalledWith({
      data: containing({
        operation: BLOCKCHAIN_OPERATION.revoke,
        status: ANCHOR_STATUS.failed,
      }),
    });
  });

  it('leaves anchorStatus alone on a revoke failure, because the anchor did land', async () => {
    const { service, tx } = build();

    await service.markQueueFailure(
      'cred_123',
      BLOCKCHAIN_OPERATION.revoke,
      'redis unreachable',
    );

    const data = update(tx).mock.calls[0][0] as { data: object };
    expect(data.data).not.toHaveProperty('anchorStatus');
  });

  it('logs but touches no credential column for an operation it does not know', async () => {
    // An unrecognised operation is a programming error, not a credential whose
    // status is known to be wrong. Guessing one would corrupt a healthy row.
    const { service, tx } = build();

    await service.markQueueFailure(
      'cred_123',
      'SOMETHING_ELSE',
      'redis unreachable',
    );

    expect(update(tx)).not.toHaveBeenCalled();
    expect(create(tx)).toHaveBeenCalledWith({
      data: containing({ status: ANCHOR_STATUS.failed }),
    });
  });
});
