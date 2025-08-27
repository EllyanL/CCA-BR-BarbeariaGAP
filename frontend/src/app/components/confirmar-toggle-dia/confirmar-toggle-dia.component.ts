import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmar-toggle-dia',
  templateUrl: './confirmar-toggle-dia.component.html',
  styleUrls: ['./confirmar-toggle-dia.component.css']
})
export class ConfirmarToggleDiaComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { dia: string },
    private dialogRef: MatDialogRef<ConfirmarToggleDiaComponent>
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
