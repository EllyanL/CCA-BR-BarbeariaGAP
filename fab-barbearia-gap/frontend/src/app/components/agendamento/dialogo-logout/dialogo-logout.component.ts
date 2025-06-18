import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-dialogo-logout',
  template: `<h1 class="dialog__title" mat-dialog-title>Confirmação</h1>
  <div class="dialog__content" mat-dialog-content>
    <p class="dialog__text">Tem certeza que deseja sair?</p>
  </div>
  <div class="dialog__actions" mat-dialog-actions>
    <button
      mat-button
      class="dialog__button dialog__button--cancel"
      (click)="cancel()"
    >
      CANCELAR
    </button>
    <button
      mat-button
      class="dialog__button dialog__button--confirm"
      color="primary"
      (click)="logout()"
    >
      CONFIRMAR
    </button>
  </div>
  `,
})
export class DialogoLogoutComponent {

  constructor(private authService: AuthService,
    public dialogRef: MatDialogRef<DialogoLogoutComponent>,
  ) { }

  cancel() {
    this.dialogRef.close();
  }

  logout() {
    this.dialogRef.close();
    this.authService.logout();
  }
}
