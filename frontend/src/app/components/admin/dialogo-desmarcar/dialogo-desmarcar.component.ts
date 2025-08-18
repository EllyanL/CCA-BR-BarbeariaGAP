import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Militar } from 'src/app/models/militar';

@Component({
  selector: 'app-dialogo-desmarcar',
  templateUrl: './dialogo-desmarcar.component.html',
  styleUrls: ['./dialogo-desmarcar.component.css']
})
export class DialogoDesmarcarComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public dados: { id: number; dia: string; hora: string; militar?: Militar | null },
    public dialogRef: MatDialogRef<DialogoDesmarcarComponent>
  ) {}

  formatarNomeCompleto(posto: string, nomeGuerra: string): string {
    return `${posto} ${nomeGuerra}`
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  desmarcar(): void {
    this.dialogRef.close(true);
  }
}
