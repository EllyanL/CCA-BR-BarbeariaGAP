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
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;

class AgendamentoServiceTimeWindowTests {
    private AgendamentoService service;
    private AgendamentoRepository repo;
    private HorarioRepository horarioRepo;

    @BeforeEach
    void setup() {
        repo = mock(AgendamentoRepository.class);
        horarioRepo = mock(HorarioRepository.class);
        service = new AgendamentoService(repo, horarioRepo);
    }

    @Test
    void validarRegrasDeNegocioLancaExcecaoQuandoHorarioMenosDeQuinzeMinutos() {
        Militar m = new Militar();
        m.setSaram("123");
        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now());
        ag.setHora(LocalTime.now().plusMinutes(5).withSecond(0).withNano(0));
        ag.setDiaSemana("segunda");
        ag.setCategoria("GRADUADO");
        ag.setMilitar(m);

        when(repo.findUltimoAgendamentoBySaram("123")).thenReturn(Optional.empty());
        when(repo.existsByDataAndHoraAndDiaSemanaAndCategoria(any(), any(), any(), any())).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> service.validarRegrasDeNegocio(ag));
    }
}
