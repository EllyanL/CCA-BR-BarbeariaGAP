package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

@SpringBootTest
@AutoConfigureTestDatabase
@Transactional
class AgendamentoDeletionIntegrationTests {

    @Autowired
    private AgendamentoService agendamentoService;

    @Autowired
    private HorarioService horarioService;

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private HorarioRepository horarioRepository;

    @Autowired
    private MilitarRepository militarRepository;

    @Test
    void deletingAgendamentoFreesHorario() {
        Militar m = new Militar();
        m.setCpf("123");
        m.setRole(UserRole.GRADUADO);
        militarRepository.save(m);

        Horario horario = new Horario("segunda", "08:00", "GRADUADO", HorarioStatus.AGENDADO);
        horarioRepository.save(horario);

        Agendamento ag = new Agendamento();
        ag.setData(LocalDate.now().plusDays(1));
        ag.setHora(LocalTime.parse("08:00"));
        ag.setDiaSemana("segunda");
        ag.setCategoria("GRADUADO");
        ag.setMilitar(m);
        agendamentoRepository.save(ag);

        agendamentoService.delete(ag.getId());
        horarioService.disponibilizarHorario("segunda", "08:00", "GRADUADO");

        boolean exists = agendamentoRepository.existsByHoraAndDiaSemanaAndCategoria(
                LocalTime.parse("08:00"), "segunda", "GRADUADO");
        Horario updated = horarioRepository.findByDiaAndHorarioAndCategoria(
                "segunda", "08:00", "GRADUADO").orElseThrow();

        assertFalse(exists);
        assertEquals(HorarioStatus.DISPONIVEL, updated.getStatus());
    }
}
