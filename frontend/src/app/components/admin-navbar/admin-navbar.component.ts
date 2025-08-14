import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogoGerenciarHorariosComponent } from '../dialogo-gerenciar-horarios/dialogo-gerenciar-horarios.component';

@Component({
  selector: 'app-admin-navbar',
  templateUrl: './admin-navbar.component.html',
  styleUrls: ['./admin-navbar.component.css']
})
export class AdminNavbarComponent implements OnInit {
  @Input() containerClass = '';
  @Input() contentClass = '';
  /** Categoria atualmente ativa na página (OFICIAL, GRADUADO, etc.) */
  @Input() categoria = '';
  isAdmin = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
  }

  logout(): void {
    this.authService.logout();
  }

  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  abrirDialogoGerenciarHorarios(): void {
    this.dialog.open(DialogoGerenciarHorariosComponent, {
      width: '400px',
      data: { categoria: this.categoria }
    });
  }
}
