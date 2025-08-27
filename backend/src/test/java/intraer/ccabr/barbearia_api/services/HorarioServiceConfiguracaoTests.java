package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;
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
        assertThrows(IllegalArgumentException.class, () -> service.disponibilizarHorario("terça", LocalTime.parse("08:00"), "GRADUADO"));
    }

    @Test
    void getHorariosUnicosRespeitaHorarioInicioConfigurado() {
        when(horarioRepo.findAll()).thenReturn(List.of(
            new Horario("terca", LocalTime.parse("08:00"), "GRADUADO", HorarioStatus.DISPONIVEL),
            new Horario("terca", LocalTime.parse("10:00"), "GRADUADO", HorarioStatus.DISPONIVEL)
        ));

        List<String> result = service.getHorariosUnicos();
        assertEquals(List.of("09:00", "09:30", "10:00", "10:30", "11:00"), result);
    }

    @Test
    void adicionarHorarioBaseParaTodosComIncrementoInvalidoLancaExcecao() {
        assertThrows(IllegalArgumentException.class,
            () -> service.adicionarHorarioBaseParaTodos("10:15"));
    }

    @Test
    void disponibilizarHorarioInexistenteRetornaNull() {
        when(horarioRepo.findByDiaAndHorarioAndCategoria("terca", LocalTime.parse("10:00"), "GRADUADO"))
                .thenReturn(java.util.Optional.empty());

        Horario result = service.disponibilizarHorario("terça", LocalTime.parse("10:00"), "GRADUADO");

        assertNull(result);
        verify(horarioRepo, never()).save(any());
    }

    @Test
    void indisponibilizarHorarioInexistenteRetornaNull() {
        when(horarioRepo.findByDiaAndHorarioAndCategoria("terca", LocalTime.parse("10:00"), "GRADUADO"))
                .thenReturn(java.util.Optional.empty());

        Horario result = service.indisponibilizarHorario("terça", LocalTime.parse("10:00"), "GRADUADO");

        assertNull(result);
        verify(horarioRepo, never()).save(any());
    }

    @Test
    void removerHorarioPersonalizadoExistenteDeletaRegistro() {
        Horario h = new Horario("terca", LocalTime.parse("10:00"), "GRADUADO", HorarioStatus.DISPONIVEL);
        when(horarioRepo.findByDiaAndHorarioAndCategoria("terca", LocalTime.parse("10:00"), "GRADUADO"))
                .thenReturn(java.util.Optional.of(h));

        boolean result = service.removerHorarioPersonalizado("terça", LocalTime.parse("10:00"), "GRADUADO");

        assertTrue(result);
        verify(horarioRepo).delete(h);
    }

    @Test
    void removerHorarioPersonalizadoInexistenteRetornaFalse() {
        when(horarioRepo.findByDiaAndHorarioAndCategoria("terca", LocalTime.parse("10:00"), "GRADUADO"))
                .thenReturn(java.util.Optional.empty());

        boolean result = service.removerHorarioPersonalizado("terça", LocalTime.parse("10:00"), "GRADUADO");

        assertFalse(result);
        verify(horarioRepo, never()).delete(any());
    }

    @Test
    void indisponibilizarHorarioAlteraStatusParaIndisponivel() {
        Horario h = new Horario("terca", LocalTime.parse("10:00"), "GRADUADO", HorarioStatus.DISPONIVEL);
        when(horarioRepo.findByDiaAndHorarioAndCategoria("terca", LocalTime.parse("10:00"), "GRADUADO"))
                .thenReturn(java.util.Optional.of(h));
        when(agendamentoRepo.existsByHoraAndDiaSemanaAndCategoria(LocalTime.parse("10:00"), "terca", "GRADUADO"))
                .thenReturn(false);
        when(horarioRepo.save(any(Horario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Horario result = service.indisponibilizarHorario("terça", LocalTime.parse("10:00"), "GRADUADO");

        assertEquals(HorarioStatus.INDISPONIVEL, result.getStatus());
        verify(horarioRepo, never()).delete(any());
    }

    @Test
    void disponibilizarHorarioNoLimiteSuperiorEhPermitido() {
        when(configService.buscarConfiguracao()).thenReturn(
            new ConfiguracaoAgendamento(1L, LocalTime.of(8,0), LocalTime.of(16,0), null));

        Horario h = new Horario("terca", LocalTime.parse("16:00"), "GRADUADO", HorarioStatus.INDISPONIVEL);
        when(horarioRepo.findByDiaAndHorarioAndCategoria("terca", LocalTime.parse("16:00"), "GRADUADO"))
                .thenReturn(java.util.Optional.of(h));
        when(agendamentoRepo.existsByHoraAndDiaSemanaAndCategoria(LocalTime.parse("16:00"), "terca", "GRADUADO"))
                .thenReturn(false);
        when(horarioRepo.save(any(Horario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Horario result = service.disponibilizarHorario("terça", LocalTime.parse("16:00"), "GRADUADO");

        assertEquals(HorarioStatus.DISPONIVEL, result.getStatus());
    }
}
