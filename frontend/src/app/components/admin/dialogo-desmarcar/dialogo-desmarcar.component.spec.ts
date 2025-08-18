import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DialogoDesmarcarComponent } from './dialogo-desmarcar.component';

describe('DialogoDesmarcarComponent', () => {
  let component: DialogoDesmarcarComponent;
  let fixture: ComponentFixture<DialogoDesmarcarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogoDesmarcarComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } }
      ]
    });
    fixture = TestBed.createComponent(DialogoDesmarcarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
