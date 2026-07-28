import { ArgumentsHost, BadRequestException } from '@nestjs/common';

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
});
