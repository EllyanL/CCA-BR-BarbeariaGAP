import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';
import { MilitarBloqueado } from '../../models/militar-bloqueado';

@Component({
  selector: 'app-admin-bloqueios',
  templateUrl: './admin-bloqueios.component.html',
  styleUrls: ['./admin-bloqueios.component.css']
})
export class AdminBloqueiosComponent implements OnInit {
  displayedColumns: string[] = [
    'postoGrad',
    'nome',
    'saram',
    'categoria',
    'ultimaData',
    'diasRestantes',
    'acoes'
  ];
  dataSource = new MatTableDataSource<MilitarBloqueado>([]);
  carregando = false;
  erroCarregamento = false;

  constructor(
    private agendamentoService: AgendamentoService,
    private snackBar: MatSnackBar,
    private logger: LoggingService
  ) {}

  ngOnInit(): void {
    this.carregarBloqueados();
  }

  carregarBloqueados(): void {
    this.carregando = true;
    this.erroCarregamento = false;
    this.agendamentoService.listarBloqueados15Dias().subscribe({
      next: bloqueados => {
        this.dataSource.data = bloqueados;
        this.carregando = false;
      },
      error: erro => {
        this.logger.error('Erro ao carregar bloqueados de 15 dias:', erro);
        this.erroCarregamento = true;
        this.carregando = false;
        this.snackBar.open('Não foi possível carregar os usuários bloqueados.', 'Fechar', {
          duration: 5000
        });
      }
    });
  }

  liberar(militar: MilitarBloqueado): void {
    if (!militar?.militarId) {
      return;
    }

    this.agendamentoService.liberarRestricao15Dias(militar.militarId).subscribe({
      next: () => {
        const nome = militar.nomeDeGuerra || militar.nomeCompleto || militar.saram || 'Usuário';
        this.snackBar.open(`Restrição de 15 dias removida para ${nome}.`, 'Fechar', {
          duration: 4000
        });
        this.dataSource.data = this.dataSource.data.filter(item => item.militarId !== militar.militarId);
      },
      error: erro => {
        this.logger.error('Erro ao liberar restrição de 15 dias:', erro);
        this.snackBar.open('Não foi possível liberar o usuário.', 'Fechar', {
          duration: 5000
        });
      }
    });
  }

  obterNome(militar: MilitarBloqueado): string {
    return militar.nomeDeGuerra || militar.nomeCompleto || militar.saram || '—';
  }
}
