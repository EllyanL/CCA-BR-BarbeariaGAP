import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { DashboardService } from '../../services/dashboard.service';
import { LoggingService } from '../../services/logging.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminDashboardComponent],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getStats: () => of({
              agendamentosHoje: 0,
              totalUsuarios: 0,
              distribuicaoPorCategoria: {},
              ocupacaoAtual: 0
            }),
            getRecent: () => of([])
          }
        },
        { provide: LoggingService, useValue: { error: () => {}, log: () => {}, warn: () => {} } },
        { provide: AuthService, useValue: { logout: () => {} } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    });
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
