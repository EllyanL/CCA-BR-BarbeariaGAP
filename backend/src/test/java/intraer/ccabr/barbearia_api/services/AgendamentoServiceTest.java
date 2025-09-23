package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AgendamentoServiceTest {

    private static final ZoneId ZONE_ID = ZoneId.of("America/Sao_Paulo");

    @Mock
    private AgendamentoRepository agendamentoRepository;

    @Mock
    private HorarioRepository horarioRepository;

    @Mock
    private ConfiguracaoAgendamentoService configuracaoAgendamentoService;

    @Mock
    private MilitarRepository militarRepository;

    private AtomicReference<ZonedDateTime> agoraRef;

    private ConfiguracaoAgendamento configuracao;

    private AgendamentoService service;

    @BeforeEach
    void setUp() {
        agoraRef = new AtomicReference<>(ZonedDateTime.of(LocalDate.of(2024, 7, 1), LocalTime.of(8, 0), ZONE_ID));
        configuracao = new ConfiguracaoAgendamento(1L, LocalTime.of(8, 0), LocalTime.of(18, 0), null);
        service = new TestableAgendamentoService(
            agendamentoRepository,
            horarioRepository,
            configuracaoAgendamentoService,
            militarRepository,
            () -> agoraRef.get()
        );
        when(configuracaoAgendamentoService.buscarConfiguracao()).thenReturn(configuracao);
        when(agendamentoRepository.findUltimoAgendamentoBySaram(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void devePermitirPrimeiroHorarioSegundaDentroDaJanelaDe30Minutos() {
        agoraRef.set(ZonedDateTime.of(LocalDate.of(2024, 7, 1), LocalTime.of(7, 45), ZONE_ID));
        LocalDate data = LocalDate.of(2024, 7, 1);
        LocalTime hora = configuracao.getHorarioInicio();

        assertTrue(service.podeAgendarDataHora(data, hora));

        Agendamento agendamento = criarAgendamento(data, hora);
        assertDoesNotThrow(() -> service.validarRegrasDeNegocio(agendamento));
    }

    @Test
    void deveBloquearAgendamentosComMenosDe30MinutosATercaFeira() {
        agoraRef.set(ZonedDateTime.of(LocalDate.of(2024, 7, 2), LocalTime.of(8, 15), ZONE_ID));
        LocalDate data = LocalDate.of(2024, 7, 2);
        LocalTime hora = configuracao.getHorarioInicio().plusMinutes(30);

        assertFalse(service.podeAgendarDataHora(data, hora));

        Agendamento agendamento = criarAgendamento(data, hora);
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.validarRegrasDeNegocio(agendamento)
        );
        assertEquals("O agendamento deve ser feito com pelo menos 30 minutos de antecedência.", exception.getReason());
    }

    private Agendamento criarAgendamento(LocalDate data, LocalTime hora) {
        Militar militar = new Militar();
        militar.setSaram("123456");

        Agendamento agendamento = new Agendamento();
        agendamento.setData(data);
        agendamento.setHora(hora);
        agendamento.setMilitar(militar);
        agendamento.setCategoria("GRADUADO");
        agendamento.setStatus("AGENDADO");
        return agendamento;
    }

    private static class TestableAgendamentoService extends AgendamentoService {

        private final Supplier<ZonedDateTime> nowSupplier;

        TestableAgendamentoService(
            AgendamentoRepository agendamentoRepository,
            HorarioRepository horarioRepository,
            ConfiguracaoAgendamentoService configuracaoAgendamentoService,
            MilitarRepository militarRepository,
            Supplier<ZonedDateTime> nowSupplier
        ) {
            super(agendamentoRepository, horarioRepository, configuracaoAgendamentoService, militarRepository);
            this.nowSupplier = nowSupplier;
        }

        @Override
        protected ZonedDateTime agora() {
            return nowSupplier.get();
        }
    }
}
