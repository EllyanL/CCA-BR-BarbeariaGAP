package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.ConfiguracaoAgendamentoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class ConfiguracaoAgendamentoService {

    private final ConfiguracaoAgendamentoRepository repository;

    public ConfiguracaoAgendamentoService(ConfiguracaoAgendamentoRepository repository) {
        this.repository = repository;
    }

    public ConfiguracaoAgendamento buscarConfiguracao() {
        return repository.findById(1L).orElseGet(() ->
                repository.save(new ConfiguracaoAgendamento(1L, LocalTime.of(9,10), LocalTime.of(18,10), LocalDateTime.now())));
    }

    public ConfiguracaoAgendamento atualizar(LocalTime inicio, LocalTime fim) {
        ConfiguracaoAgendamento configuracao = buscarConfiguracao();
        configuracao.setHorarioInicio(inicio);
        configuracao.setHorarioFim(fim);
        return repository.save(configuracao);
    }
}
