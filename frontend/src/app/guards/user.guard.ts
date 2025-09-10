import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserGuard {

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): boolean {
    if (
      this.authService.isAdmin() ||
      this.authService.isGraduado() ||
      this.authService.isOficial() ||
      this.authService.isUser()
    ) {
      return true;
    }
    this.router.navigate(['/not-authorized']);
    return false;
  }
  
}
