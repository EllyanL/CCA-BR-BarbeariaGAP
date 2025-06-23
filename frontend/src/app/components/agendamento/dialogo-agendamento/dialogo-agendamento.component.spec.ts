import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoAgendamentoComponent } from './dialogo-agendamento.component';

describe('DialogoAgendamentoComponent', () => {
  let component: DialogoAgendamentoComponent;
  let fixture: ComponentFixture<DialogoAgendamentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogoAgendamentoComponent]
    });
    fixture = TestBed.createComponent(DialogoAgendamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
