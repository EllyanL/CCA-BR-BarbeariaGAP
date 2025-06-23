import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoCancelamentoComponent } from './dialogo-cancelamento.component';

describe('DialogoCancelamentoComponent', () => {
  let component: DialogoCancelamentoComponent;
  let fixture: ComponentFixture<DialogoCancelamentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogoCancelamentoComponent]
    });
    fixture = TestBed.createComponent(DialogoCancelamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
