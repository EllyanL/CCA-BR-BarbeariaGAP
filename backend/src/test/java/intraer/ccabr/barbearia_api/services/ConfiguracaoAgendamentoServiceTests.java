package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.models.ConfiguracaoAgendamento;
import intraer.ccabr.barbearia_api.repositories.ConfiguracaoAgendamentoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ConfiguracaoAgendamentoServiceTests {

    @Autowired
    private ConfiguracaoAgendamentoRepository repository;

    @Test
    void atualizarPersisteERefleteNovosHorarios() {
        ConfiguracaoAgendamentoService service = new ConfiguracaoAgendamentoService(repository);

        // Fallback defaults
        ConfiguracaoAgendamento fallback = service.buscarConfiguracao();
        assertThat(fallback.getHorarioInicio()).isEqualTo(LocalTime.of(8, 0));
        assertThat(fallback.getHorarioFim()).isEqualTo(LocalTime.of(18, 0));

        // Update to new interval
        service.atualizar(LocalTime.of(8, 0), LocalTime.of(17, 0));

        ConfiguracaoAgendamento updated = service.buscarConfiguracao();
        assertThat(updated.getHorarioInicio()).isEqualTo(LocalTime.of(8, 0));
        assertThat(updated.getHorarioFim()).isEqualTo(LocalTime.of(17, 0));
    }
}
