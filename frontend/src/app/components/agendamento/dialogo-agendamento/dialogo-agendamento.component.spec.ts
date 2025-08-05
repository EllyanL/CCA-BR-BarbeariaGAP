import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogoAgendamentoComponent } from './dialogo-agendamento.component';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of, ReplaySubject } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { AgendamentoService } from '../../../services/agendamento.service';
import { LoggingService } from '../../../services/logging.service';
import { ErrorMessagesService } from '../../../services/error-messages.service';
import { Agendamento } from '../../../models/agendamento';

describe('DialogoAgendamentoComponent', () => {
  let component: DialogoAgendamentoComponent;
  let fixture: ComponentFixture<DialogoAgendamentoComponent>;

  let userSubject: ReplaySubject<any>;

  beforeEach(() => {
    userSubject = new ReplaySubject(1);
    const userServiceStub = { userData$: userSubject.asObservable() } as Partial<UserService>;
    const agendamentoServiceStub = { createAgendamento: () => of({} as Agendamento) } as Partial<AgendamentoService>;
    TestBed.configureTestingModule({
      imports: [MatDialogModule, MatSnackBarModule, FormsModule],
      declarations: [DialogoAgendamentoComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { data: new Date(), hora: '00:00', diaSemana: 'segunda', categoria: 'GRADUADO', opcoesPostoGrad: [] } },
        { provide: UserService, useValue: userServiceStub },
        { provide: AgendamentoService, useValue: agendamentoServiceStub },
        { provide: LoggingService, useValue: { log: () => {}, error: () => {} } },
        { provide: ErrorMessagesService, useValue: new ErrorMessagesService() }
      ]
    });
    fixture = TestBed.createComponent(DialogoAgendamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should destroy without errors', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
