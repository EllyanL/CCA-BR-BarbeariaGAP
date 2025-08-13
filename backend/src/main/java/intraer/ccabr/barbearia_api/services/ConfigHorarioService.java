package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.models.ConfigHorario;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.ConfigHorarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class ConfigHorarioService {

    private static final Long CONFIG_ID = 1L;
    private static final LocalTime DEFAULT_INICIO = LocalTime.of(8, 0);
    private static final LocalTime DEFAULT_FIM = LocalTime.of(18, 0);

    private final ConfigHorarioRepository repository;
    private final AgendamentoRepository agendamentoRepository;

    public ConfigHorarioService(ConfigHorarioRepository repository, AgendamentoRepository agendamentoRepository) {
        this.repository = repository;
        this.agendamentoRepository = agendamentoRepository;
    }

    public ConfigHorario buscarConfiguracao() {
        return repository.findById(CONFIG_ID)
                .orElse(new ConfigHorario(CONFIG_ID, DEFAULT_INICIO, DEFAULT_FIM, null));
    }

    public ConfigHorario atualizar(LocalTime inicio, LocalTime fim) {
        LocalTime janelaInicio = inicio.plusMinutes(10);
        LocalTime janelaFim = fim.minusMinutes(30);
        if (agendamentoRepository.existsAtivoForaJanela(janelaInicio, janelaFim)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "JANELA_CONFLITO_AGENDAMENTOS_ATIVOS");
        }

        ConfigHorario config = repository.findById(CONFIG_ID)
                .orElse(new ConfigHorario(CONFIG_ID, inicio, fim, LocalDateTime.now()));
        config.setInicio(inicio);
        config.setFim(fim);
        return repository.save(config);
    }
}
