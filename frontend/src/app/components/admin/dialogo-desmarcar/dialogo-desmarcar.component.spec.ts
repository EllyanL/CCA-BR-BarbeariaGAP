import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoDesmarcarComponent } from './dialogo-desmarcar.component';

describe('DialogoDesmarcarComponent', () => {
  let component: DialogoDesmarcarComponent;
  let fixture: ComponentFixture<DialogoDesmarcarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogoDesmarcarComponent]
    });
    fixture = TestBed.createComponent(DialogoDesmarcarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
