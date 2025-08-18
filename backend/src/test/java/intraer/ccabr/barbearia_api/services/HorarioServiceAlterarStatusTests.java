package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;

class HorarioServiceAlterarStatusTests {
    private HorarioService service;
    private HorarioRepository horarioRepo;
    private AgendamentoRepository agendamentoRepo;
    private ConfiguracaoAgendamentoService configService;

    @BeforeEach
    void setup() {
        horarioRepo = mock(HorarioRepository.class);
        agendamentoRepo = mock(AgendamentoRepository.class);
        configService = mock(ConfiguracaoAgendamentoService.class);
        service = new HorarioService(horarioRepo, agendamentoRepo, configService);
    }

    @Test
    void alterarStatusComAgendamentoAtivoLancaExcecao() {
        Horario h = new Horario("segunda", "10:00", "GRADUADO", HorarioStatus.DISPONIVEL);
        h.setId(1L);
        when(horarioRepo.findById(1L)).thenReturn(Optional.of(h));
        when(agendamentoRepo.existsByHoraAndDiaSemanaAndCategoria(LocalTime.parse("10:00"), "segunda", "GRADUADO")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service.alterarStatus(1L, HorarioStatus.INDISPONIVEL));
        verify(horarioRepo, never()).save(any());
    }

    @Test
    void alterarStatusSemAgendamentoAtualizaHorario() {
        Horario h = new Horario("segunda", "10:00", "GRADUADO", HorarioStatus.DISPONIVEL);
        h.setId(1L);
        when(horarioRepo.findById(1L)).thenReturn(Optional.of(h));
        when(agendamentoRepo.existsByHoraAndDiaSemanaAndCategoria(LocalTime.parse("10:00"), "segunda", "GRADUADO")).thenReturn(false);
        when(horarioRepo.save(any(Horario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        HorarioDTO result = service.alterarStatus(1L, HorarioStatus.INDISPONIVEL);

        assertEquals(HorarioStatus.INDISPONIVEL.name(), result.getStatus());
    }
}
