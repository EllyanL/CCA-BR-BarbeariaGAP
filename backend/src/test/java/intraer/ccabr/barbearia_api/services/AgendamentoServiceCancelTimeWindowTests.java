package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;

class AgendamentoServiceCancelTimeWindowTests {
    private AgendamentoService service;
    private AgendamentoRepository repo;
    private HorarioRepository horarioRepo;
    private ConfiguracaoAgendamentoService configService;

    @BeforeEach
    void setup() {
        repo = mock(AgendamentoRepository.class);
        horarioRepo = mock(HorarioRepository.class);
        configService = mock(ConfiguracaoAgendamentoService.class);
        service = new AgendamentoService(repo, horarioRepo, configService);
    }

    @Test
    void naoPermiteCancelarMenosDeTrintaMinutosParaNaoAdmin() {
        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now());
        ag.setHora(LocalTime.now().plusMinutes(20).withSecond(0).withNano(0));
        when(repo.findById(1L)).thenReturn(Optional.of(ag));

        assertThrows(IllegalStateException.class, () -> service.cancelarAgendamento(1L, "USUARIO"));
        verify(repo, never()).save(any());
    }

    @Test
    void adminPodeCancelarMesmoMenosDeTrintaMinutos() {
        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now());
        ag.setHora(LocalTime.now().plusMinutes(20).withSecond(0).withNano(0));
        when(repo.findById(1L)).thenReturn(Optional.of(ag));

        service.cancelarAgendamento(1L, "ADMIN");
        verify(repo).save(any(Agendamento.class));
    }
}
