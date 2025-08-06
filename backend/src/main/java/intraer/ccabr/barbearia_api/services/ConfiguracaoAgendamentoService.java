package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.ConfiguracaoAgendamentoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class ConfiguracaoAgendamentoService {

    private static final Long CONFIG_ID = 1L;
    private static final LocalTime DEFAULT_INICIO = LocalTime.of(8, 0);
    private static final LocalTime DEFAULT_FIM = LocalTime.of(18, 0);

    private final ConfiguracaoAgendamentoRepository repository;

    public ConfiguracaoAgendamentoService(ConfiguracaoAgendamentoRepository repository) {
        this.repository = repository;
    }

    public ConfiguracaoAgendamento buscarConfiguracao() {
        return repository.findById(CONFIG_ID)
                .orElse(new ConfiguracaoAgendamento(CONFIG_ID, DEFAULT_INICIO, DEFAULT_FIM, null));
    }

    public ConfiguracaoAgendamento atualizar(LocalTime inicio, LocalTime fim) {
        ConfiguracaoAgendamento configuracao = repository.findById(CONFIG_ID)
                .orElse(new ConfiguracaoAgendamento(CONFIG_ID, inicio, fim, LocalDateTime.now()));
        configuracao.setHorarioInicio(inicio);
        configuracao.setHorarioFim(fim);
        return repository.save(configuracao);
    }
}
