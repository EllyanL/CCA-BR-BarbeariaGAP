package intraer.ccabr.barbearia_api.repositories;

import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AgendamentoRepositoryPeriodoTests {

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private MilitarRepository militarRepository;

    @Test
    void findByCategoriaAndPeriodoHandlesNullDates() {
        Militar militar = new Militar();
        militar.setCpf("cpf1");
        militar.setSaram("0001");
        militar.setCategoria(UserRole.GRADUADO);
        militarRepository.save(militar);

        Agendamento a1 = Agendamento.builder()
                .data(LocalDate.of(2024, 1, 1))
                .hora(LocalTime.of(9, 0))
                .diaSemana("segunda")
                .categoria("GRADUADO")
                .militar(militar)
                .status("AGENDADO")
                .build();
        Agendamento a2 = Agendamento.builder()
                .data(LocalDate.of(2024, 1, 5))
                .hora(LocalTime.of(10, 0))
                .diaSemana("segunda")
                .categoria("GRADUADO")
                .militar(militar)
                .status("AGENDADO")
                .build();
        Agendamento a3 = Agendamento.builder()
                .data(LocalDate.of(2024, 1, 10))
                .hora(LocalTime.of(11, 0))
                .diaSemana("segunda")
                .categoria("GRADUADO")
                .militar(militar)
                .status("AGENDADO")
                .build();
        agendamentoRepository.saveAll(List.of(a1, a2, a3));

        List<Agendamento> todos = agendamentoRepository.findByCategoriaAndPeriodo("GRADUADO", null, null);
        assertThat(todos).containsExactlyInAnyOrder(a1, a2, a3);

        List<Agendamento> ate = agendamentoRepository.findByCategoriaAndPeriodo("GRADUADO", null, LocalDate.of(2024, 1, 5));
        assertThat(ate).containsExactlyInAnyOrder(a1, a2);

        List<Agendamento> desde = agendamentoRepository.findByCategoriaAndPeriodo("GRADUADO", LocalDate.of(2024, 1, 5), null);
        assertThat(desde).containsExactlyInAnyOrder(a2, a3);
    }
}

