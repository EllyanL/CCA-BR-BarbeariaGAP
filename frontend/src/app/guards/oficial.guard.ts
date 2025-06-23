import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OficialGuard {

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): boolean {
    if (this.authService.isOficial()) {
      return true;
    } else {
      this.router.navigate(['/not-authorized']);
      return false;
    }
  }
}
