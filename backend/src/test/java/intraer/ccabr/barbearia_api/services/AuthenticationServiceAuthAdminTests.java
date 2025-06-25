package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.dtos.LoginResponseDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

class AuthenticationServiceAuthAdminTests {
    private AuthenticationService service;
    private MilitarRepository repository;
    private TokenService tokenService;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setup() {
        repository = mock(MilitarRepository.class);
        tokenService = mock(TokenService.class);
        passwordEncoder = mock(PasswordEncoder.class);
        service = new AuthenticationService(repository, tokenService, passwordEncoder, mock(AuthenticationManager.class));
    }

    @Test
    void authenticateAdminReturnsTokenWhenCredentialsValid() {
        Militar admin = new Militar();
        admin.setCpf("000");
        admin.setSenha("enc");
        admin.setRole(UserRole.ADMIN);
        when(repository.findByCpf("000")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("senha", "enc")).thenReturn(true);
        when(tokenService.generateToken(admin)).thenReturn("tok");

        ResponseEntity<LoginResponseDTO> resp = service.authenticateAdmin(new AuthenticationDTO("000", "senha"));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("tok", resp.getBody().getToken());
    }

    @Test
    void authenticateAdminUnauthorizedWhenInvalid() {
        when(repository.findByCpf("000")).thenReturn(Optional.empty());

        ResponseEntity<LoginResponseDTO> resp = service.authenticateAdmin(new AuthenticationDTO("000", "senha"));

        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }
}
