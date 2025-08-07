package intraer.ccabr.barbearia_api.controllers;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;

import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AgendamentoService;

@WebMvcTest(AgendamentoController.class)
@AutoConfigureMockMvc(addFilters = false)
class AgendamentoControllerAdminParamsTests {

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
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = "ADMIN")
    void missingDatesReturnsBadRequest() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/agendamentos/admin"))
                .andExpect(status().isBadRequest());
    }
}
