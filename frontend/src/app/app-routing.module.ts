import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './pages/admin/admin.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
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
import { UserGuard } from './guards/user.guard';
import { GerenciarHorariosComponent } from './pages/gerenciar-horarios/gerenciar-horarios.component';

const routes: Routes = [
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    { path: 'auth/login', component: LoginComponent, data: { title: 'Login' } },
    { path: 'oficiais', component: OficiaisComponent, data: { title: 'BARBEARIA - OFICIAIS' }, canActivate: [OficialGuard] },
    { path: 'graduados', component: GraduadosComponent, data: { title: 'BARBEARIA - GRADUADOS' }, canActivate: [GraduadoGuard] },
    { path: 'admin', component: AdminComponent, data: { title: 'Admin' }, canActivate: [AdminGuard] },
    { path: 'admin/horarios', component: HorariosComponent, data: { title: 'Gerenciar Horários' }, canActivate: [AdminGuard] },
    { path: 'admin/dashboard', component: AdminDashboardComponent, data: { title: 'Dashboard Admin' }, canActivate: [AdminGuard] },
    { path: 'admin/usuarios', component: UsuariosComponent, data: { title: 'Usuários' }, canActivate: [AdminGuard] },
    { path: 'admin/gerenciar_horarios', component: GerenciarHorariosComponent, canActivate: [AdminGuard], data: { title: 'Gerenciar Horários' } },
    { path: 'admin/gerenciar_registros', component: GerenciarRegistrosComponent, canActivate: [AdminGuard], data: { title: 'Gerenciar Registros' } },
    { path: 'not-authorized', component: NotAuthorizedComponent, data: { title: 'Acesso não autorizado' } },
    { path: '**', component: NotFoundComponent, data: { title: 'Página não encontrada' } }
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }
