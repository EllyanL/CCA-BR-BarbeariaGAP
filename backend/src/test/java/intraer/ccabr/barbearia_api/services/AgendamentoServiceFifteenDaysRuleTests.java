package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;

class AgendamentoServiceFifteenDaysRuleTests {
    private AgendamentoService service;
    private AgendamentoRepository repo;
    private HorarioRepository horarioRepo;
    private ConfiguracaoAgendamentoService configService;

    @BeforeEach
    void setup() {
        repo = mock(AgendamentoRepository.class);
        horarioRepo = mock(HorarioRepository.class);
        configService = mock(ConfiguracaoAgendamentoService.class);
        when(configService.buscarConfiguracao()).thenReturn(new ConfiguracaoAgendamento(1L, LocalTime.of(9,10), LocalTime.of(18,10), null));
        service = new AgendamentoService(repo, horarioRepo, configService);
    }

    @Test
    void validarRegrasDeNegocioLancaExcecaoQuandoJaAgendadoNosUltimos15Dias() {
        Militar m = new Militar();
        m.setSaram("123");
        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now().plusDays(1));
        ag.setHora(LocalTime.of(9, 10));
        ag.setDiaSemana("segunda");
        ag.setCategoria("GRADUADO");
        ag.setMilitar(m);

        Agendamento ultimo = new Agendamento();
        ultimo.setData(LocalDate.now());
        when(repo.findUltimoAgendamentoBySaram("123")).thenReturn(Optional.of(ultimo));
        when(repo.existsByDataAndHoraAndDiaSemanaAndCategoria(any(), any(), any(), any())).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> service.validarRegrasDeNegocio(ag));
    }

    @Test
    void validarRegrasDeNegocioNaoLancaExcecaoQuandoUltimoAgendamentoCancelado() {
        Militar m = new Militar();
        m.setSaram("123");
        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now().plusDays(1));
        ag.setHora(LocalTime.of(9, 10));
        ag.setDiaSemana("segunda");
        ag.setCategoria("GRADUADO");
        ag.setMilitar(m);

        Agendamento ultimo = new Agendamento();
        ultimo.setData(LocalDate.now());
        ultimo.setStatus("CANCELADO");
        when(repo.findUltimoAgendamentoBySaram("123")).thenReturn(Optional.of(ultimo));
        when(repo.existsByDataAndHoraAndDiaSemanaAndCategoria(any(), any(), any(), any())).thenReturn(false);

        assertDoesNotThrow(() -> service.validarRegrasDeNegocio(ag));
    }
}
