package intraer.ccabr.barbearia_api.repositories;

import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.enums.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AgendamentoRepositoryTests {

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private MilitarRepository militarRepository;

    @Test
    void findByMilitarCpfAndCategoriaAndDataAfterExcludesCancelled() {
        Militar militar = new Militar();
        militar.setCpf("123");
        militar.setSaram("0001");
        militar.setCategoria(UserRole.GRADUADO);
        militarRepository.save(militar);

        Agendamento agAtivo = Agendamento.builder()
                .data(LocalDate.now().plusDays(1))
                .hora(LocalTime.of(10, 0))
                .diaSemana("segunda")
                .categoria("GRADUADO")
                .militar(militar)
                .status("AGENDADO")
                .build();
        Agendamento agCancelado = Agendamento.builder()
                .data(LocalDate.now().plusDays(1))
                .hora(LocalTime.of(11, 0))
                .diaSemana("segunda")
                .categoria("GRADUADO")
                .militar(militar)
                .status("CANCELADO")
                .build();
        agendamentoRepository.saveAll(List.of(agAtivo, agCancelado));

        List<Agendamento> resultado = agendamentoRepository
                .findByMilitarCpfAndCategoriaAndDataAfter("123", "GRADUADO", LocalDate.now());

        assertThat(resultado).containsExactly(agAtivo);
    }
}
