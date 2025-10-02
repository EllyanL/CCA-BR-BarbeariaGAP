package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

import intraer.ccabr.barbearia_api.enums.DiaSemana;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AgendamentoServiceTest {

    @Mock
    private AgendamentoRepository agendamentoRepository;

    @Mock
    private HorarioRepository horarioRepository;

    @Mock
    private ConfiguracaoAgendamentoService configuracaoAgendamentoService;

    @Mock
    private MilitarRepository militarRepository;

    @InjectMocks
    private AgendamentoService agendamentoService;

    @Test
    void criarAgendamentoMarcaHorarioComoAgendado() {
        when(agendamentoRepository.save(any(Agendamento.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(horarioRepository.save(any(Horario.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        LocalDate data = LocalDate.of(2024, 7, 1);
        LocalTime hora = LocalTime.of(10, 0);
        String dia = DiaSemana.SEGUNDA.getValor();
        String categoria = "GRADUADO";

        Agendamento agendamento = new Agendamento();
        agendamento.setData(data);
        agendamento.setHora(hora);
        agendamento.setDiaSemana(dia);
        agendamento.setCategoria(categoria);

        Horario horario = new Horario(dia, hora, categoria, HorarioStatus.DISPONIVEL);

        when(horarioRepository.findByDiaAndHorarioAndCategoria(dia, hora, categoria))
                .thenReturn(Optional.of(horario));
        when(agendamentoRepository.existsAtivoByDataAndHoraAndDiaSemanaAndCategoria(data, hora, dia, categoria))
                .thenReturn(false);

        Agendamento resultado = agendamentoService.criarAgendamentoTransactional(agendamento);

        assertSame(agendamento, resultado);

        ArgumentCaptor<Horario> horarioCaptor = ArgumentCaptor.forClass(Horario.class);
        verify(horarioRepository).save(horarioCaptor.capture());
        assertEquals(HorarioStatus.AGENDADO, horarioCaptor.getValue().getStatus());
    }

    @Test
    void naoPermiteNovoAgendamentoQuandoHorarioJaEstaIndisponivel() {
        LocalTime hora = LocalTime.of(10, 0);
        String dia = DiaSemana.SEGUNDA.getValor();
        String categoria = "GRADUADO";

        Horario horario = new Horario(dia, hora, categoria, HorarioStatus.INDISPONIVEL);

        when(horarioRepository.findByDiaAndHorarioAndCategoria(dia, hora, categoria))
                .thenReturn(Optional.of(horario));

        Agendamento agendamento = new Agendamento();
        agendamento.setData(LocalDate.of(2024, 7, 1));
        agendamento.setHora(hora);
        agendamento.setDiaSemana(dia);
        agendamento.setCategoria(categoria);

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> agendamentoService.criarAgendamentoTransactional(agendamento));

        assertEquals("Horário indisponível", exception.getMessage());
        verify(horarioRepository, never()).save(any(Horario.class));
        verify(agendamentoRepository, never()).save(any(Agendamento.class));
    }

    @Test
    void verificarHorarioDisponivelDetectaConflitoNaMesmaData() {
        LocalDate data = LocalDate.of(2024, 7, 1);
        LocalTime hora = LocalTime.of(10, 0);
        String dia = DiaSemana.SEGUNDA.getValor();
        String categoria = "GRADUADO";

        Horario horario = new Horario(dia, hora, categoria, HorarioStatus.DISPONIVEL);

        when(horarioRepository.findByDiaAndHorarioAndCategoria(dia, hora, categoria))
                .thenReturn(Optional.of(horario));
        when(agendamentoRepository.existsAtivoByDataAndHoraAndDiaSemanaAndCategoria(data, hora, dia, categoria))
                .thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
                agendamentoService.verificarHorarioDisponivel(data, dia, hora, categoria));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void verificarHorarioDisponivelPermiteQuandoNaoHaConflito() {
        LocalDate data = LocalDate.of(2024, 7, 1);
        LocalTime hora = LocalTime.of(11, 0);
        String dia = DiaSemana.SEGUNDA.getValor();
        String categoria = "GRADUADO";

        Horario horario = new Horario(dia, hora, categoria, HorarioStatus.DISPONIVEL);

        when(horarioRepository.findByDiaAndHorarioAndCategoria(dia, hora, categoria))
                .thenReturn(Optional.of(horario));
        when(agendamentoRepository.existsAtivoByDataAndHoraAndDiaSemanaAndCategoria(data, hora, dia, categoria))
                .thenReturn(false);

        assertDoesNotThrow(() -> agendamentoService.verificarHorarioDisponivel(data, dia, hora, categoria));
        verify(agendamentoRepository).existsAtivoByDataAndHoraAndDiaSemanaAndCategoria(data, hora, dia, categoria);
    }

    @Test
    void cancelarAgendamentoUsuarioMesmoDiaDentroDe30MinutosLancaExcecao() {
        Long agendamentoId = 1L;
        Agendamento agendamento = new Agendamento();
        agendamento.setId(agendamentoId);
        agendamento.setData(LocalDate.of(2024, 7, 1));
        agendamento.setHora(LocalTime.of(10, 0));
        agendamento.setDiaSemana(DiaSemana.SEGUNDA.getValor());
        agendamento.setCategoria("GRADUADO");

        when(agendamentoRepository.findById(agendamentoId)).thenReturn(Optional.of(agendamento));

        AgendamentoService spyService = spy(agendamentoService);
        ZonedDateTime agora = ZonedDateTime.of(2024, 7, 1, 9, 45, 0, 0, ZoneId.of("America/Sao_Paulo"));
        doReturn(agora).when(spyService).agora();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> spyService.cancelarAgendamento(agendamentoId, "USUARIO"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(agendamentoRepository, never()).save(any(Agendamento.class));
    }

    @Test
    void cancelarAgendamentoUsuarioDiaSeguinteDentroDe30MinutosPermitido() {
        Long agendamentoId = 2L;
        Agendamento agendamento = new Agendamento();
        agendamento.setId(agendamentoId);
        agendamento.setData(LocalDate.of(2024, 7, 2));
        agendamento.setHora(LocalTime.of(0, 10));
        agendamento.setDiaSemana(DiaSemana.TERCA.getValor());
        agendamento.setCategoria("GRADUADO");

        when(agendamentoRepository.findById(agendamentoId)).thenReturn(Optional.of(agendamento));
        when(agendamentoRepository.save(agendamento)).thenReturn(agendamento);
        when(horarioRepository.findByDiaAndHorarioAndCategoria(anyString(), any(), anyString()))
                .thenReturn(Optional.empty());

        AgendamentoService spyService = spy(agendamentoService);
        ZonedDateTime agora = ZonedDateTime.of(2024, 7, 1, 23, 45, 0, 0, ZoneId.of("America/Sao_Paulo"));
        doReturn(agora).when(spyService).agora();

        assertDoesNotThrow(() -> spyService.cancelarAgendamento(agendamentoId, "USUARIO"));

        assertEquals("CANCELADO", agendamento.getStatus());
        assertEquals("USUARIO", agendamento.getCanceladoPor());
        verify(agendamentoRepository).save(agendamento);
    }
}
