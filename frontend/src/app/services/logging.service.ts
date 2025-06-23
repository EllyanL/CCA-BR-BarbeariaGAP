import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  log(message?: any, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.log(message, ...optionalParams);
    }
  }

  warn(message?: any, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message?: any, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.error(message, ...optionalParams);
    }
  }
}
