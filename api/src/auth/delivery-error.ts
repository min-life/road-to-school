import { ServiceUnavailableException } from '@nestjs/common';

/** Uncertain delivery must not trigger a new OTP or an automatic second send. */
export class DeliveryError extends ServiceUnavailableException {
  constructor(message: string, readonly uncertain = false) {
    super(message);
  }
}
