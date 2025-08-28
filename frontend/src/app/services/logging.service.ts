import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  log(message?: unknown, ...optionalParams: unknown[]): void {
    if (!environment.production) {
      console.log(message as unknown, ...(optionalParams as unknown[]));
    }
  }

  warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (!environment.production) {
      console.warn(message as unknown, ...(optionalParams as unknown[]));
    }
  }

  error(message?: unknown, ...optionalParams: unknown[]): void {
    if (!environment.production) {
      console.error(message as unknown, ...(optionalParams as unknown[]));
    }
  }
}
