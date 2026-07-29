import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AppConfigService } from '../../config/app-config.service';
import { AppExceptionFilter } from './app-exception.filter';

/**
 * Errors raised before Nest gets the request — body-parser rejecting an
 * oversized body is the common one — are `http-errors` objects, not
 * HttpExceptions. They must keep their own 4xx status: reporting them as 500
 * tells the client the server broke and lets any caller manufacture a fake
 * server error on any JSON endpoint.
 */
describe('AppExceptionFilter — pre-Nest middleware errors', () => {
  /**
   * The shape `http-errors` produces, built by hand rather than pulling the
   * package in as a test dependency: a named Error carrying `status`,
   * `statusCode` and `expose`. This is exactly what body-parser throws.
   */
  const httpError = (status: number, message: string, name: string) =>
    Object.assign(new Error(message), {
      name,
      status,
      statusCode: status,
      expose: status < 500,
    });

  const build = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', path: '/verify/document/code' }),
      }),
    } as unknown as ArgumentsHost;

    const filter = new AppExceptionFilter({
      isExposedEnv: false,
    } as unknown as AppConfigService);

    return { filter, host, status, json };
  };

  it('keeps the 413 from an oversized request body', () => {
    const { filter, host, status, json } = build();

    filter.catch(
      httpError(413, 'request entity too large', 'PayloadTooLargeError'),
      host,
    );

    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 413 }),
    );
  });

  it('does not pass a dependency 5xx through to the client', () => {
    const { filter, host, status } = build();

    filter.catch(httpError(502, 'upstream exploded', 'BadGatewayError'), host);

    // Falls to the generic 500 branch — only 4xx is trusted from these errors,
    // so an upstream failure is never reported as the upstream's own status.
    expect(status).toHaveBeenCalledWith(500);
  });

  it('does not disturb ordinary HttpExceptions', () => {
    const { filter, host, status, json } = build();

    filter.catch(new BadRequestException('verificationCode is invalid'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'verificationCode is invalid' }),
    );
  });

  it('still reports a plain Error as 500', () => {
    const { filter, host, status } = build();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
  });

  /**
   * A Prisma error message quotes the absolute path and line number of the
   * call site, a snippet of the surrounding source, and the whole `where`
   * clause including column names. `POST /verify/credential/code` is public
   * and unauthenticated, so an anonymous caller was able to read all of it by
   * sending an array where a string was expected. The filter is the right
   * place for the guard — a DTO on one route protects one route.
   *
   * Note `isExposedEnv: false` in `build()`: this asserts the leak is closed
   * in development too, not only in staging and production.
   */
  it('does not leak the Prisma query, path or line number', () => {
    const { filter, host, status, json } = build();

    filter.catch(
      new Prisma.PrismaClientValidationError(
        '\nInvalid `this.prisma.credential.findFirst()` invocation in\n' +
          '/home/user/app/apps/api/src/modules/verification/verification.service.ts:194:53\n\n' +
          '  where: { deletedAt: null, OR: [ { credentialExternalId: ["a","b"] } ] }',
        { clientVersion: '6.0.0' },
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);

    const body = JSON.stringify(
      (json as jest.Mock<unknown, [unknown]>).mock.calls[0][0],
    );
    expect(body).not.toContain('/home/');
    expect(body).not.toContain('.service.ts:');
    expect(body).not.toContain('credentialExternalId');
    expect(body).not.toContain('findFirst');
  });

  it('keeps the mapped Prisma codes mapped', () => {
    const { filter, host, status } = build();

    filter.catch(
      new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
  });
});
