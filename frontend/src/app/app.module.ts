import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';

import { AdminComponent } from './pages/admin/admin.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CapitalizePipe } from './pipes/capitalize.pipe';
import { CpfMaskDirective } from './directives/cpf-mask.directive';
import { DialogoAgendamentoComponent } from './components/agendamento/dialogo-agendamento/dialogo-agendamento.component';
import { DialogoCancelamentoComponent } from './components/agendamento/dialogo-cancelamento/dialogo-cancelamento.component';
import { DialogoEditarAgendamentoComponent } from './components/agendamento/dialogo-editar-agendamento/dialogo-editar-agendamento.component';
import { DialogoDesmarcarComponent } from './components/admin/dialogo-desmarcar/dialogo-desmarcar.component';
import { DialogoDetalhesAgendamentoComponent } from './components/agendamento/dialogo-detalhes-agendamento/dialogo-detalhes-agendamento.component';
import { DialogoLogoutComponent } from './components/agendamento/dialogo-logout/dialogo-logout.component';
import { FooterComponent } from './components/layout/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { GraduadosComponent } from './pages/graduados/graduados.component';
import { HeaderComponent } from './components/layout/header/header.component';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';
import { AdminNavbarComponent } from './components/admin-navbar/admin-navbar.component';
import { HorariosComponent } from './pages/horarios/horarios.component';
import { LoginComponent } from './pages/login/login.component';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Importação do módulo do spinner
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { NgModule } from '@angular/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { NotAuthorizedComponent } from './pages/not-authorized/not-authorized.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { OficiaisComponent } from './pages/oficiais/oficiais.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { OrientacoesComponent } from './components/agendamento/orientacoes/orientacoes.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabelaSemanalComponent } from './components/agendamento/tabela-semanal/tabela-semanal.component';

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    DialogoAgendamentoComponent,
    DialogoCancelamentoComponent,
    DialogoDetalhesAgendamentoComponent,
    DialogoEditarAgendamentoComponent,
    OrientacoesComponent,
    TabelaSemanalComponent,
    GraduadosComponent,
    OficiaisComponent,
    LoginComponent,
    HeaderComponent,
    DialogoLogoutComponent,
    NotFoundComponent,
    CapitalizePipe,
    NotAuthorizedComponent,
    AdminComponent,
    HorariosComponent,
    DialogoDesmarcarComponent,
    CpfMaskDirective,
    AdminDashboardComponent,
    SidebarComponent,
    UsuariosComponent,
    AdminNavbarComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpClientModule,
    RouterModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,

    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MatBadgeModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatNativeDateModule,
    NgxMaterialTimepickerModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  exports: [AdminNavbarComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
