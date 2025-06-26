import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DialogoLogoutComponent } from '../../agendamento/dialogo-logout/dialogo-logout.component';
import { OrientacoesComponent } from '../../agendamento/orientacoes/orientacoes.component';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  constructor(private dialog: MatDialog, private router: Router) {}

  openRegras(): void {
    this.dialog.open(OrientacoesComponent, { enterAnimationDuration: '500ms' });
  }

  logout(): void {
    this.dialog.open(DialogoLogoutComponent, { width: '300px' });
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
