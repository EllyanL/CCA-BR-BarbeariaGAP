import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AuthService } from 'src/app/services/auth.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

describe('AdminNavbarComponent', () => {
  let component: AdminNavbarComponent;
  let fixture: ComponentFixture<AdminNavbarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminNavbarComponent],
      imports: [MatSidenavModule, MatListModule, MatIconModule, MatButtonModule],
      providers: [
        { provide: AuthService, useValue: { isAdmin: () => true, logout: () => {} } }
      ]
    });
    fixture = TestBed.createComponent(AdminNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders sidebar links, header logo and action icons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('mat-nav-list a');
    const logo = compiled.querySelector('img.header-logo');
    const icons = compiled.querySelectorAll('.header-icons mat-icon');

    expect(links.length).toBeGreaterThanOrEqual(4);
    expect(logo).toBeTruthy();
    expect(icons.length).toBe(3);
  });
});
