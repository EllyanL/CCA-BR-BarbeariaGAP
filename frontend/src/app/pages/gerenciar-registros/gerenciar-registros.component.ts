import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Agendamento } from '../../models/agendamento';
import { AgendamentoService } from '../../services/agendamento.service';
import { LoggingService } from '../../services/logging.service';

function compararDesc(a: Agendamento, b: Agendamento): number {
  const dataA = new Date(`${a.data}T${a.hora}`).getTime();
  const dataB = new Date(`${b.data}T${b.hora}`).getTime();
  return dataB - dataA;
}

@Component({
  selector: 'app-gerenciar-registros',
  templateUrl: './gerenciar-registros.component.html',
  styleUrls: ['./gerenciar-registros.component.css'],
  providers: [DatePipe]
})
export class GerenciarRegistrosComponent implements OnInit, AfterViewInit {
  displayedColumns = [
    'data',
    'hora',
    'nomeDeGuerra',
    'postoGrad',
    'status',
    'canceladoPor'
  ];

  dataSource = new MatTableDataSource<Agendamento>([]);
  todosRegistros: Agendamento[] = [];

  filtros = {
    texto: '',
    hora: '',
    dataInicio: undefined as Date | undefined,
    dataFim: undefined as Date | undefined,
    status: [] as string[]
  };

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private agendamentoService: AgendamentoService,
    private logger: LoggingService,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
      this.sort.active = 'data';
      this.sort.direction = 'desc';
      this.sort.sort({ id: 'data', start: 'desc', disableClear: true } as MatSortable);
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'data':
            return new Date(`${item.data}T${item.hora || '00:00'}`).getTime();
          default:
            return (item as any)[property];
        }
      };
    }
  }

  carregarAgendamentos(): void {
    this.agendamentoService.listarAgendamentosAdmin().subscribe({
      next: agendamentos => {
        this.todosRegistros = agendamentos.sort((a, b) => compararDesc(a, b));
        this.aplicarFiltros();
      },
      error: err => {
        this.logger.error('Erro ao carregar agendamentos:', err);
        this.snackBar.open('Erro ao carregar agendamentos', 'Fechar', {
          duration: 3000
        });
      }
    });
  }

  aplicarFiltros(): void {
    let filtrados = [...this.todosRegistros];

    if (this.filtros.texto) {
      const termo = this.filtros.texto.toLowerCase();
      filtrados = filtrados.filter(a =>
        (a.militar?.nomeDeGuerra || '').toLowerCase().includes(termo) ||
        (a.militar?.postoGrad || '').toLowerCase().includes(termo)
      );
    }

    if (this.filtros.hora) {
      filtrados = filtrados.filter(a => (a.hora || '').startsWith(this.filtros.hora));
    }

    if (this.filtros.dataInicio || this.filtros.dataFim) {
      const inicio = this.filtros.dataInicio ? this.normalizarData00(this.filtros.dataInicio) : undefined;
      const fim = this.filtros.dataFim ? this.normalizarData2359(this.filtros.dataFim) : undefined;
      filtrados = filtrados.filter(a => {
        const dataHora = new Date(`${a.data}T${a.hora || '00:00'}`);
        return (!inicio || dataHora >= inicio) && (!fim || dataHora <= fim);
      });
    }

    if (this.filtros.status.length) {
      const statusUpper = this.filtros.status.map(s => s.toUpperCase());
      filtrados = filtrados.filter(a => {
        const statusAtual = (a.status || '').toUpperCase();
        return statusUpper.includes(statusAtual);
      });
    }

    filtrados.sort((a, b) => compararDesc(a, b));
    this.dataSource.data = filtrados;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  limparCampo(campo: keyof typeof this.filtros): void {
    if (campo === 'status') {
      this.filtros.status = [];
    } else if (campo === 'dataInicio' || campo === 'dataFim') {
      (this.filtros as any)[campo] = undefined;
    } else {
      (this.filtros as any)[campo] = '';
    }
    this.aplicarFiltros();
  }

  limparTodosFiltros(): void {
    this.filtros.texto = '';
    this.filtros.hora = '';
    this.filtros.dataInicio = undefined;
    this.filtros.dataFim = undefined;
    this.filtros.status = [];
    this.aplicarFiltros();
  }

  async exportarPdf(): Promise<void> {
    this.aplicarFiltros();
    const rows = this.dataSource.data;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const brasao = await this.loadImage('assets/images/logo-ccabr.png');

      // Header
      doc.setFontSize(16);
      doc.text('Barbearia GAP - Registros', pageWidth / 2, 15, {
        align: 'center'
      });

      let headerText = 'Todos os registros';
      if (this.filtros.dataInicio || this.filtros.dataFim) {
        const dataIni = this.formatarDataBR(this.filtros.dataInicio);
        const dataFim = this.formatarDataBR(this.filtros.dataFim);
        headerText = `Intervalo de Busca: ${dataIni} À ${dataFim}`;
      }
      doc.setFontSize(11);
      doc.text(headerText, pageWidth / 2, 22, { align: 'center' });

      // Table with filtered rows
      autoTable(doc, {
        startY: 30,
        head: [
          [
            'DATA',
            'HORA',
            'POSTO/GRAD',
            'NOME DE GUERRA',
            'STATUS',
            'CANCELADO POR'
          ]
        ],
        body: rows.map(r => [
          this.formatarDataBR(r.data),
          this.formatarHoraBR(r.hora),
          r.militar?.postoGrad ?? '',
          this.formatName(r.militar?.nomeDeGuerra),
          this.formatarStatus(r.status ?? ''),
          this.formatarCanceladoPor(r.canceladoPor)
        ]),
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [220, 220, 220] }
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = pageHeight - 20;
        doc.addImage(brasao, 'PNG', 10, footerY - 10, 15, 15);
        doc.setFontSize(9);
        doc.text('Barbearia GAP - Força Aérea Brasileira', 30, footerY);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save('registros.pdf');
    } catch (err) {
      this.logger.error('Erro ao exportar PDF:', err);
    }
  }

  formatarDataBR(data?: string | Date | null): string {
    return data ? this.datePipe.transform(data, 'dd/MM/yyyy', undefined, 'pt-BR') ?? '' : '';
  }

  formatarHoraBR(hora?: string | Date | null): string {
    if (!hora) {
      return '';
    }
    const date = hora instanceof Date ? hora : new Date(`1970-01-01T${hora}`);
    return this.datePipe.transform(date, 'HH:mm', undefined, 'pt-BR') ?? '';
  }

  formatName(nome?: string | null): string {
    if (!nome) {
      return '';
    }
    return nome
      .toLowerCase()
      .split(' ')
      .map(n => n.charAt(0).toUpperCase() + n.substring(1))
      .join(' ');
  }

  formatarCanceladoPor(valor?: string | null): string {
    if (!valor) {
      return '';
    }
    const mapa: Record<string, string> = {
      ADMIN: 'Admin',
      USUARIO: 'Usuário'
    };
    return mapa[valor.toUpperCase()] || valor;
  }

  formatarStatus(texto?: string | null): string {
    if (!texto) return '';
    const mapa: Record<string, string> = {
      DISPONIVEL: 'Disponível',
      INDISPONIVEL: 'Indisponível',
      AGENDADO: 'Agendado',
      CANCELADO: 'Cancelado',
      REALIZADO: 'Realizado'
    };
    const key = texto.toUpperCase();
    return mapa[key] || texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  statusClass(status?: string): string {
    const s = (status || '').toUpperCase();
    return (
      {
        AGENDADO: 'status-agendado',
        CANCELADO: 'status-cancelado',
        REALIZADO: 'status-realizado',
        INDISPONIVEL: 'status-indisponivel'
      } as any
    )[s] || '';
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = err => reject(err);
    });
  }

  normalizarData00(data: Date): Date {
    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  normalizarData2359(data: Date): Date {
    const d = new Date(data);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
