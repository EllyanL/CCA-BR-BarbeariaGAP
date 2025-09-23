package intraer.ccabr.barbearia_api.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.dtos.LoginResponseDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AuthenticationService;
import intraer.ccabr.barbearia_api.services.LdapService;
import intraer.ccabr.barbearia_api.services.TokenService;
import intraer.ccabr.barbearia_api.services.WebserviceService;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthenticationControllerTest {

    @Mock private AuthenticationService authenticationService;

    @Mock private LdapService ldapService;

    @Mock private WebserviceService webserviceService;

    @Mock private MilitarRepository militarRepository;

    @Mock private PasswordEncoder passwordEncoder;

    @Mock private TokenService tokenService;

    @InjectMocks private AuthenticationController controller;

    @Test
    void loginShouldReuseLocalDataWhenMissingFieldsArePersistedAsNotInformedAndSyncIsRecent() {
        String cpf = "12345678901";
        AuthenticationDTO request = new AuthenticationDTO(cpf, "senha");

        Militar existing = buildBaseMilitar(cpf);
        existing.setLastWebserviceSync(LocalDateTime.now());
        existing.setSecao("Não informado");
        existing.setRamal("Não informado");

        when(militarRepository.findByCpf(cpf)).thenReturn(Optional.of(existing));
        when(ldapService.authenticateLdap(request)).thenReturn(true);
        when(tokenService.generateToken(existing)).thenReturn("jwt-token");

        ResponseEntity<LoginResponseDTO> response = controller.login(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("jwt-token", response.getBody().getToken());

        verify(webserviceService, never()).fetchMilitarByCpf(anyString());
        verify(authenticationService, never()).createFromWebserviceData(any());
    }

    @Test
    void loginShouldTriggerWebserviceSyncWhenLastSyncIsStaleEvenIfFieldsAreNotInformed() {
        String cpf = "10987654321";
        AuthenticationDTO request = new AuthenticationDTO(cpf, "senha");

        Militar existing = buildBaseMilitar(cpf);
        existing.setLastWebserviceSync(LocalDateTime.now().minusDays(2));
        existing.setSecao("Não informado");
        existing.setRamal("Não informado");

        CcabrUserDto webserviceDto = new CcabrUserDto();
        webserviceDto.setCpf(cpf);
        webserviceDto.setCategoria(UserRole.USER.name());
        webserviceDto.setSecao("SEC");
        webserviceDto.setRamal("123");
        webserviceDto.setPostoGrad("CB");
        webserviceDto.setNomeDeGuerra("Fulano");
        webserviceDto.setNomeCompleto("Fulano de Tal");
        webserviceDto.setEmail("fulano@example.com");
        webserviceDto.setOm("OM-1");
        webserviceDto.setSaram("00000");
        webserviceDto.setQuadro("QUAD");

        Militar persisted = buildBaseMilitar(cpf);
        persisted.setId(99L);
        persisted.setSecao("SEC");
        persisted.setRamal("123");

        when(militarRepository.findByCpf(cpf)).thenReturn(Optional.of(existing));
        when(ldapService.authenticateLdap(request)).thenReturn(true);
        when(webserviceService.fetchMilitarByCpf(cpf)).thenReturn(webserviceDto);
        when(authenticationService.createFromWebserviceData(webserviceDto)).thenReturn(persisted);
        when(tokenService.generateToken(persisted)).thenReturn("jwt-token");

        ResponseEntity<LoginResponseDTO> response = controller.login(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("jwt-token", response.getBody().getToken());

        verify(webserviceService).fetchMilitarByCpf(cpf);
        verify(authenticationService).createFromWebserviceData(webserviceDto);
    }

    private Militar buildBaseMilitar(String cpf) {
        Militar militar = new Militar();
        militar.setId(1L);
        militar.setCpf(cpf);
        militar.setCategoria(UserRole.USER);
        militar.setPostoGrad("CB");
        militar.setOm("OM-1");
        militar.setNomeDeGuerra("Fulano");
        militar.setNomeCompleto("Fulano de Tal");
        militar.setEmail("fulano@example.com");
        militar.setSaram("00000");
        militar.setSenha(Militar.LDAP_AUTH_PLACEHOLDER);
        return militar;
    }
}
