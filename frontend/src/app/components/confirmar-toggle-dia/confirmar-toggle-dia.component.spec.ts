import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmarToggleDiaComponent } from './confirmar-toggle-dia.component';

describe('ConfirmarToggleDiaComponent', () => {
  let component: ConfirmarToggleDiaComponent;
  let fixture: ComponentFixture<ConfirmarToggleDiaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmarToggleDiaComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { dia: 'segunda' } },
        { provide: MatDialogRef, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(ConfirmarToggleDiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
