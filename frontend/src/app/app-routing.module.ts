import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OficiaisComponent } from './pages/oficiais/oficiais.component';
import { GraduadosComponent } from './pages/graduados/graduados.component';
import { LoginComponent } from './pages/login/login.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AdminGuard } from './guards/admin.guard';
import { OficialGuard } from './guards/oficial.guard';
import { GraduadoGuard } from './guards/graduado.guard';
import { NotAuthorizedComponent } from './pages/not-authorized/not-authorized.component';
import { AdminComponent } from './pages/admin/admin.component';
import { HorariosComponent } from './pages/horarios/horarios.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UserGuard } from './guards/user.guard';

  const routes: Routes = [
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    { path: 'auth/login', component: LoginComponent, data: { title: 'Login' } },
    { path: 'oficiais', component: OficiaisComponent, data: { title: 'Oficiais' }, canActivate: [OficialGuard] },
    { path: 'graduados', component: GraduadosComponent, data: { title: 'Graduados' }, canActivate: [GraduadoGuard] },
    { path: 'admin', component: AdminComponent, data: { title: 'Admin' }, canActivate: [AdminGuard] },
    { path: 'admin/horarios', component: HorariosComponent, data: { title: 'Gerenciar Horários' }, canActivate: [AdminGuard] },
    { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' }, canActivate: [UserGuard] },
    { path: 'not-authorized', component: NotAuthorizedComponent, data: { title: 'Acesso não autorizado' } },
    { path: '**', component: NotFoundComponent, data: { title: 'Página não encontrada' } }
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }
