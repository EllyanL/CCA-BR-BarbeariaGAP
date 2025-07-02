import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { HorariosService } from 'src/app/services/horarios.service';
import { LoggingService } from 'src/app/services/logging.service';
import { AuthService } from 'src/app/services/auth.service';

import { OficiaisComponent } from './oficiais.component';

describe('OficiaisComponent', () => {
  let component: OficiaisComponent;
  let fixture: ComponentFixture<OficiaisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OficiaisComponent],
      providers: [
        { provide: AuthService, useValue: { getUsuarioAutenticado: () => ({ id: 1, saram: '1' }) } },
        { provide: MatDialog, useValue: {} },
        { provide: HorariosService, useValue: { carregarHorariosDaSemana: () => of({}) } },
        { provide: LoggingService, useValue: { log: () => {}, error: () => {} } }
      ]
    });
    fixture = TestBed.createComponent(OficiaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
