package intraer.ccabr.barbearia_api.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AuthenticationService;
import intraer.ccabr.barbearia_api.services.CcabrService;
import intraer.ccabr.barbearia_api.services.LdapService;

@WebMvcTest(AuthenticationController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthenticationControllerLoginTests {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthenticationService authenticationService;
    @MockBean
    private LdapService ldapService;
    @MockBean
    private CcabrService ccabrService;
    @MockBean
    private MilitarRepository militarRepository;
    @MockBean
    private PasswordEncoder passwordEncoder;
    @MockBean
    private TokenService tokenService;

    @Test
    @WithMockUser
    void adminLoginReturnsToken() throws Exception {
        Militar admin = new Militar();
        admin.setCpf("00000000000");
        admin.setSenha("enc");
        admin.setCategoria(UserRole.ADMIN);
        when(militarRepository.findByCpf("00000000000")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("senha", "enc")).thenReturn(true);
        when(tokenService.generateToken(admin)).thenReturn("tok");

        ObjectMapper om = new ObjectMapper();
        String body = om.writeValueAsString(new AuthenticationDTO("00000000000", "senha"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.token").value("tok"));
    }
}
