package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
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
import org.springframework.web.server.ResponseStatusException;

class AgendamentoServicePastDateTests {
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
    void validarRegrasDeNegocioLancaExcecaoParaDataPassada() {
        Militar m = new Militar();
        m.setSaram("123");
        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now().minusDays(1));
        ag.setHora(LocalTime.of(9, 10));
        ag.setDiaSemana("segunda");
        ag.setCategoria("GRADUADO");
        ag.setMilitar(m);

        when(repo.findUltimoAgendamentoBySaram("123")).thenReturn(Optional.empty());
        when(repo.existsByDataAndHoraAndDiaSemanaAndCategoria(any(), any(), any(), any())).thenReturn(false);

        assertThrows(ResponseStatusException.class, () -> service.validarRegrasDeNegocio(ag));
    }
}
