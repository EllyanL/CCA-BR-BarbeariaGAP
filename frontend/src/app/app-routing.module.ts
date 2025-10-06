import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './pages/admin/admin.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AdminBloqueiosComponent } from './pages/admin-bloqueios/admin-bloqueios.component';
import { AdminGuard } from './guards/admin.guard';
import { GraduadoGuard } from './guards/graduado.guard';
import { GraduadosComponent } from './pages/graduados/graduados.component';
import { HorariosComponent } from './pages/horarios/horarios.component';
import { LoginComponent } from './pages/login/login.component';
import { NgModule } from '@angular/core';
import { NotAuthorizedComponent } from './pages/not-authorized/not-authorized.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { OficiaisComponent } from './pages/oficiais/oficiais.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { GerenciarRegistrosComponent } from './pages/gerenciar-registros/gerenciar-registros.component';
import { OficialGuard } from './guards/oficial.guard';
import { MeusAgendamentosComponent } from './pages/meus-agendamentos/meus-agendamentos.component';
import { UserGuard } from './guards/user.guard';

const routes: Routes = [
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    { path: 'auth/login', component: LoginComponent, data: { title: 'Login' } },
    { path: 'oficiais', component: OficiaisComponent, data: { title: 'BARBEARIA - OFICIAIS' }, canActivate: [OficialGuard] },
    { path: 'graduados', component: GraduadosComponent, data: { title: 'BARBEARIA - GRADUADOS' }, canActivate: [GraduadoGuard] },
    { path: 'graduado', redirectTo: 'graduados' },
    { path: 'meus-agendamentos', component: MeusAgendamentosComponent, canActivate: [UserGuard] },
    { path: 'admin', component: AdminComponent, data: { title: 'Admin' }, canActivate: [AdminGuard] },
    { path: 'admin/horarios', component: HorariosComponent, data: { title: 'Gerenciar Horários' }, canActivate: [AdminGuard] },
    { path: 'admin/dashboard', component: AdminDashboardComponent, data: { title: 'Dashboard Admin' }, canActivate: [AdminGuard] },
    { path: 'admin/bloqueios', component: AdminBloqueiosComponent, data: { title: 'Regra de 15 dias' }, canActivate: [AdminGuard] },
    { path: 'admin/usuarios', component: UsuariosComponent, data: { title: 'Usuários' }, canActivate: [AdminGuard] },
    { path: 'admin/gerenciar-registros', component: GerenciarRegistrosComponent, canActivate: [AdminGuard], data: { title: 'Gerenciar Registros' } },
    { path: 'not-authorized', component: NotAuthorizedComponent, data: { title: 'Acesso não autorizado' } },
    { path: '**', component: NotFoundComponent, data: { title: 'Página não encontrada' } }
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }
