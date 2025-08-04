package intraer.ccabr.barbearia_api.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import com.fasterxml.jackson.databind.ObjectMapper;

import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AgendamentoService;

@WebMvcTest(AgendamentoController.class)
@AutoConfigureMockMvc(addFilters = false)
class AgendamentoControllerCancelTests {

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

    private Agendamento buildAgendamento(LocalDateTime dateTime, String cpf) {
        Militar militar = new Militar();
        militar.setCpf(cpf);
        militar.setCategoria(UserRole.GRADUADO);
        Agendamento ag = Agendamento.builder()
                .id(1L)
                .data(dateTime.toLocalDate())
                .hora(dateTime.toLocalTime().withSecond(0).withNano(0))
                .diaSemana("segunda")
                .militar(militar)
                .categoria("GRADUADO")
                .build();
        return ag;
    }

    @Test
    @WithMockUser(username = "123456789", roles = "GRADUADO")
    void cancelAgendamentoMenosDe30MinutosRetornaForbidden() throws Exception {
        LocalDateTime future = LocalDateTime.now().plusMinutes(20);
        Agendamento agendamento = buildAgendamento(future, "123456789");

        when(agendamentoService.findById(1L)).thenReturn(Optional.of(agendamento));
        when(agendamentoService.isAgendamentoPassado(agendamento)).thenReturn(false);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/agendamentos/{id}/cancelar", 1L))
                .andExpect(MockMvcResultMatchers.status().isForbidden())
                .andExpect(MockMvcResultMatchers.content().string("Cancelamentos devem ser feitos com antecedência mínima de 30 minutos."));

        verify(agendamentoService, never()).cancelarAgendamento(anyLong(), any());
    }

    @Test
    @WithMockUser(username = "123456789", roles = "GRADUADO")
    void cancelMoreThan30MinutesAheadSucceedsAndUpdatesHorario() throws Exception {
        LocalDateTime future = LocalDateTime.now().plusMinutes(40);
        Agendamento agendamento = buildAgendamento(future, "123456789");
        Horario horario = new Horario("segunda", agendamento.getHora().toString(), "GRADUADO", HorarioStatus.AGENDADO);

        doAnswer(invocation -> {
            horario.setStatus(HorarioStatus.DISPONIVEL);
            return null;
        }).when(agendamentoService).cancelarAgendamento(anyLong(), any());

        when(agendamentoService.findById(1L)).thenReturn(Optional.of(agendamento));
        when(agendamentoService.isAgendamentoPassado(agendamento)).thenReturn(false);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/agendamentos/{id}/cancelar", 1L))
                .andExpect(MockMvcResultMatchers.status().isNoContent());

        verify(agendamentoService).cancelarAgendamento(1L, "USUARIO");
        org.junit.jupiter.api.Assertions.assertEquals(HorarioStatus.DISPONIVEL, horario.getStatus());
    }

    @Test
    @WithMockUser(username = "000000000", roles = "GRADUADO")
    void cancelOthersAgendamentoReturnsForbidden() throws Exception {
        LocalDateTime future = LocalDateTime.now().plusMinutes(40);
        Agendamento agendamento = buildAgendamento(future, "123456789");

        when(agendamentoService.findById(1L)).thenReturn(Optional.of(agendamento));
        when(agendamentoService.isAgendamentoPassado(agendamento)).thenReturn(false);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/agendamentos/{id}/cancelar", 1L))
                .andExpect(MockMvcResultMatchers.status().isForbidden())
                .andExpect(MockMvcResultMatchers.content().string("Você só pode desmarcar seus próprios agendamentos."));

        verify(agendamentoService, never()).cancelarAgendamento(anyLong(), any());
    }

    @Test
    @WithMockUser(username = "111111111", roles = "ADMIN")
    void adminCanCancelAnyAgendamento() throws Exception {
        LocalDateTime future = LocalDateTime.now().plusMinutes(40);
        Agendamento agendamento = buildAgendamento(future, "123456789");

        when(agendamentoService.findById(1L)).thenReturn(Optional.of(agendamento));
        when(agendamentoService.isAgendamentoPassado(agendamento)).thenReturn(false);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/agendamentos/{id}/cancelar", 1L))
                .andExpect(MockMvcResultMatchers.status().isNoContent());

        verify(agendamentoService).cancelarAgendamento(1L, "ADMIN");
    }
}
