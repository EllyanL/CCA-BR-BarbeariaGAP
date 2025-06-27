import { Component, Input } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-admin-navbar',
  templateUrl: './admin-navbar.component.html',
  styleUrls: ['./admin-navbar.component.css']
})
export class AdminNavbarComponent {
  @Input() containerClass = '';
  @Input() contentClass = '';

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}
