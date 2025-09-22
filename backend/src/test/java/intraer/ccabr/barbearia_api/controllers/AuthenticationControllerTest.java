package intraer.ccabr.barbearia_api.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.dtos.LoginResponseDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AuthenticationService;
import intraer.ccabr.barbearia_api.services.LdapService;
import intraer.ccabr.barbearia_api.services.WebserviceService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthenticationControllerTest {

    @Mock
    private AuthenticationService authenticationService;

    @Mock
    private LdapService ldapService;

    @Mock
    private WebserviceService webserviceService;

    @Mock
    private MilitarRepository militarRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TokenService tokenService;

    private AuthenticationController authenticationController;

    @BeforeEach
    void setUp() {
        authenticationController = new AuthenticationController(
            authenticationService,
            ldapService,
            webserviceService,
            militarRepository,
            passwordEncoder,
            tokenService
        );
    }

    @Test
    void shouldSyncWebserviceDataWhenSectionOrExtensionMissingOnFirstLogin() {
        String cpf = "12345678901";
        AuthenticationDTO authenticationDTO = new AuthenticationDTO(cpf, "senhaSegura");

        Militar existingMilitar = new Militar();
        existingMilitar.setId(1L);
        existingMilitar.setCpf(cpf);
        existingMilitar.setCategoria(UserRole.USER);
        existingMilitar.setPostoGrad("CB");
        existingMilitar.setOm("OM");
        existingMilitar.setNomeDeGuerra("Nome Guerra");
        existingMilitar.setNomeCompleto("Nome Completo");
        existingMilitar.setSaram("123456");
        existingMilitar.setEmail("email@exemplo.com");
        existingMilitar.setSecao("Não informado");
        existingMilitar.setRamal("Não informado");

        when(militarRepository.findByCpf(cpf)).thenReturn(Optional.of(existingMilitar));
        when(ldapService.authenticateLdap(any(AuthenticationDTO.class))).thenReturn(true);

        CcabrUserDto webserviceUser = new CcabrUserDto();
        webserviceUser.setCpf(cpf);
        webserviceUser.setCategoria("USER");
        webserviceUser.setPostoGrad("CB");
        webserviceUser.setOm("OM");
        webserviceUser.setNomeDeGuerra("Nome Guerra Atualizado");
        webserviceUser.setNomeCompleto("Nome Completo Atualizado");
        webserviceUser.setSaram("123456");
        webserviceUser.setEmail("email.atualizado@exemplo.com");
        webserviceUser.setSecao("SAI");
        webserviceUser.setRamal("1234");

        when(webserviceService.fetchMilitarByCpf(cpf)).thenReturn(webserviceUser);

        Militar syncedMilitar = new Militar();
        syncedMilitar.setId(1L);
        syncedMilitar.setCpf(cpf);
        syncedMilitar.setCategoria(UserRole.USER);
        syncedMilitar.setPostoGrad("CB");
        syncedMilitar.setOm("OM");
        syncedMilitar.setNomeDeGuerra("Nome Guerra Atualizado");
        syncedMilitar.setNomeCompleto("Nome Completo Atualizado");
        syncedMilitar.setSaram("123456");
        syncedMilitar.setEmail("email.atualizado@exemplo.com");
        syncedMilitar.setSecao("SAI");
        syncedMilitar.setRamal("1234");

        when(authenticationService.createFromWebserviceData(webserviceUser)).thenReturn(syncedMilitar);
        when(tokenService.generateToken(any(Militar.class))).thenReturn("jwt-token");

        ResponseEntity<LoginResponseDTO> response = authenticationController.login(authenticationDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        LoginResponseDTO responseBody = response.getBody();
        assertNotNull(responseBody);
        assertEquals("SAI", responseBody.getSecao());
        assertEquals("1234", responseBody.getRamal());

        verify(webserviceService).fetchMilitarByCpf(cpf);
        verify(authenticationService).createFromWebserviceData(webserviceUser);
        verify(tokenService).generateToken(syncedMilitar);
    }
}
