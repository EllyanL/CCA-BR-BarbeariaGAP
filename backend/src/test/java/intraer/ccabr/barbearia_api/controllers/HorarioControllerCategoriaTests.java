package intraer.ccabr.barbearia_api.controllers;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import java.time.LocalTime;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase
@Transactional
class HorarioControllerCategoriaTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HorarioRepository horarioRepository;

    @Test
    @WithMockUser(roles = "GRADUADO")
    void listarPorCategoriaRetornaStatusSemTransformacao() throws Exception {
        horarioRepository.save(new Horario("segunda", LocalTime.parse("08:00"), "GRADUADO", HorarioStatus.DISPONIVEL));
        horarioRepository.save(new Horario("segunda", LocalTime.parse("09:00"), "GRADUADO", HorarioStatus.INDISPONIVEL));
        horarioRepository.save(new Horario("segunda", LocalTime.parse("10:00"), "GRADUADO", HorarioStatus.AGENDADO));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/horarios/categoria/{categoria}", "GRADUADO"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.segunda[*].status", containsInAnyOrder(
                "DISPONIVEL", "INDISPONIVEL", "AGENDADO")));
    }
}

