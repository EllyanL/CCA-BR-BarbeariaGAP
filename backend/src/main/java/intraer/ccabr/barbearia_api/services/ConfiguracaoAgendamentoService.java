package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.ConfiguracaoAgendamentoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class ConfiguracaoAgendamentoService {

    private static final Long CONFIG_ID = 1L;
    private static final LocalTime DEFAULT_INICIO = LocalTime.of(8, 0);
    private static final LocalTime DEFAULT_FIM = LocalTime.of(18, 0);

    private final ConfiguracaoAgendamentoRepository repository;
    private final AgendamentoRepository agendamentoRepository;

    public ConfiguracaoAgendamentoService(ConfiguracaoAgendamentoRepository repository,
                                          AgendamentoRepository agendamentoRepository) {
        this.repository = repository;
        this.agendamentoRepository = agendamentoRepository;
    }

    public ConfiguracaoAgendamento buscarConfiguracao() {
        return repository.findById(CONFIG_ID)
                .orElse(new ConfiguracaoAgendamento(CONFIG_ID, DEFAULT_INICIO, DEFAULT_FIM, null));
    }

    public ConfiguracaoAgendamento atualizar(LocalTime inicio, LocalTime fim) {
        ConfiguracaoAgendamento configuracao = repository.findById(CONFIG_ID)
                .orElse(new ConfiguracaoAgendamento(CONFIG_ID, inicio, fim, LocalDateTime.now()));

        LocalTime antigoInicio = configuracao.getHorarioInicio();
        LocalTime antigoFim = configuracao.getHorarioFim();

        boolean reducaoInicio = inicio.isAfter(antigoInicio);
        boolean reducaoFim = fim.isBefore(antigoFim);

        if (reducaoInicio || reducaoFim) {
            LocalTime janelaInicio = inicio.plusMinutes(10);
            LocalTime janelaFim = fim.minusMinutes(30);
            String[] categorias = {"GRADUADO", "OFICIAL"};
            for (String categoria : categorias) {
                if (agendamentoRepository.existsAtivoForaJanela(janelaInicio, janelaFim, categoria, LocalDate.now())) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Não é possível realizar alteração com agendamentos ativos.",
                            new Throwable("JANELA_CONFLITO_AGENDAMENTOS")
                    );
                }
            }
        }

        configuracao.setHorarioInicio(inicio);
        configuracao.setHorarioFim(fim);
        return repository.save(configuracao);
    }
}
