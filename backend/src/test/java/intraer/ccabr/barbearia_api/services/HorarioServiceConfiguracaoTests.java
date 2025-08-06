package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;

class HorarioServiceConfiguracaoTests {
    private HorarioService service;
    private HorarioRepository horarioRepo;
    private AgendamentoRepository agendamentoRepo;
    private ConfiguracaoAgendamentoService configService;

    @BeforeEach
    void setup() {
        horarioRepo = mock(HorarioRepository.class);
        agendamentoRepo = mock(AgendamentoRepository.class);
        configService = mock(ConfiguracaoAgendamentoService.class);
        when(configService.buscarConfiguracao()).thenReturn(
            new ConfiguracaoAgendamento(1L, LocalTime.of(9,0), LocalTime.of(11,0), null));
        service = new HorarioService(horarioRepo, agendamentoRepo, configService);
    }

    @Test
    void disponibilizarHorarioForaDoIntervaloLancaExcecao() {
        assertThrows(IllegalArgumentException.class, () -> service.disponibilizarHorario("segunda", "08:00", "GRADUADO"));
    }

    @Test
    void getHorariosUnicosFiltraForaDoIntervalo() {
        when(horarioRepo.findAll()).thenReturn(List.of(
            new Horario("segunda", "08:00", "GRADUADO", HorarioStatus.DISPONIVEL),
            new Horario("segunda", "10:00", "GRADUADO", HorarioStatus.DISPONIVEL)
        ));

        List<String> result = service.getHorariosUnicos();
        assertEquals(List.of("10:00"), result);
    }

    @Test
    void disponibilizarHorarioInexistenteRetornaNull() {
        when(horarioRepo.findByDiaAndHorarioAndCategoria("segunda", "10:00", "GRADUADO"))
                .thenReturn(java.util.Optional.empty());

        Horario result = service.disponibilizarHorario("segunda", "10:00", "GRADUADO");

        assertNull(result);
        verify(horarioRepo, never()).save(any());
    }

    @Test
    void indisponibilizarHorarioInexistenteRetornaNull() {
        when(horarioRepo.findByDiaAndHorarioAndCategoria("segunda", "10:00", "GRADUADO"))
                .thenReturn(java.util.Optional.empty());

        Horario result = service.indisponibilizarHorario("segunda", "10:00", "GRADUADO");

        assertNull(result);
        verify(horarioRepo, never()).save(any());
    }
}
