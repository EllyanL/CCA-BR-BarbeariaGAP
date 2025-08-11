package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

@SpringBootTest
@AutoConfigureTestDatabase
@Transactional
class AgendamentoStatusSchedulerIntegrationTests {

    @Autowired
    private AgendamentoStatusScheduler scheduler;

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private MilitarRepository militarRepository;

    @Test
    void agendamentosPassadosSaoMarcadosComoRealizados() {
        Militar m = new Militar();
        m.setCpf("cpf1");
        m.setCategoria(UserRole.GRADUADO);
        militarRepository.save(m);

        Agendamento passado = new Agendamento();
        passado.setData(LocalDate.now().minusDays(1));
        passado.setHora(LocalTime.of(9, 10));
        passado.setDiaSemana("ontem");
        passado.setCategoria("GRADUADO");
        passado.setMilitar(m);
        agendamentoRepository.save(passado);

        Agendamento futuro = new Agendamento();
        futuro.setData(LocalDate.now().plusDays(1));
        futuro.setHora(LocalTime.of(10, 10));
        futuro.setDiaSemana("amanha");
        futuro.setCategoria("GRADUADO");
        futuro.setMilitar(m);
        agendamentoRepository.save(futuro);

        Agendamento cancelado = new Agendamento();
        cancelado.setData(LocalDate.now().minusDays(1));
        cancelado.setHora(LocalTime.of(11, 10));
        cancelado.setDiaSemana("ontem");
        cancelado.setCategoria("GRADUADO");
        cancelado.setStatus("CANCELADO");
        cancelado.setCanceladoPor("ADMIN");
        cancelado.setMilitar(m);
        agendamentoRepository.save(cancelado);

        scheduler.atualizarAgendamentosRealizados();

        assertEquals("REALIZADO", agendamentoRepository.findById(passado.getId()).orElseThrow().getStatus());
        assertEquals("AGENDADO", agendamentoRepository.findById(futuro.getId()).orElseThrow().getStatus());
        Agendamento canceladoPersistido = agendamentoRepository.findById(cancelado.getId()).orElseThrow();
        assertEquals("CANCELADO", canceladoPersistido.getStatus());
        assertEquals("ADMIN", canceladoPersistido.getCanceladoPor());
    }
}

