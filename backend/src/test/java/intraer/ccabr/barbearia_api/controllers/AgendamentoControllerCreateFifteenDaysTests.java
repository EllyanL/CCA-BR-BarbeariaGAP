package intraer.ccabr.barbearia_api.controllers;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import com.fasterxml.jackson.databind.ObjectMapper;

import intraer.ccabr.barbearia_api.dtos.AgendamentoCreateDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AgendamentoService;
import intraer.ccabr.barbearia_api.services.HorarioService;

@WebMvcTest(AgendamentoController.class)
@AutoConfigureMockMvc(addFilters = false)
class AgendamentoControllerCreateFifteenDaysTests {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AgendamentoService agendamentoService;
    @MockBean
    private AgendamentoRepository agendamentoRepository;
    @MockBean
    private MilitarRepository militarRepository;
    @MockBean
    private HorarioRepository horarioRepository;
    @MockBean
    private HorarioService horarioService;
    @MockBean
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "111", roles = "GRADUADO")
    void createAgendamentoWithin15DaysReturnsConflict() throws Exception {
        AgendamentoCreateDTO dto = new AgendamentoCreateDTO();
        dto.setData(LocalDate.now().plusDays(1));
        dto.setHora(LocalTime.of(8, 0));
        dto.setDiaSemana("segunda");
        dto.setCategoria("GRADUADO");

        Militar militar = new Militar();
        militar.setCpf("111");
        militar.setCategoria(UserRole.GRADUADO);
        when(militarRepository.findByCpf("111")).thenReturn(Optional.of(militar));

        Horario horario = new Horario("segunda", "08:00", "GRADUADO", HorarioStatus.DISPONIVEL);
        when(horarioRepository.findByDiaAndHorarioAndCategoria("segunda", "08:00", "GRADUADO"))
            .thenReturn(Optional.of(horario));

        when(agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoria(any(), any(), any(), any()))
            .thenReturn(false);

        doThrow(new IllegalArgumentException("Você só pode agendar uma vez a cada 15 dias."))
            .when(agendamentoService).validarRegrasDeNegocio(any());

        ObjectMapper mapper = new ObjectMapper();
        String body = mapper.writeValueAsString(dto);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/agendamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(MockMvcResultMatchers.status().isConflict())
                .andExpect(MockMvcResultMatchers.content().string(
                        "Você só pode marcar um corte a cada 15 dias."));
    }
}
