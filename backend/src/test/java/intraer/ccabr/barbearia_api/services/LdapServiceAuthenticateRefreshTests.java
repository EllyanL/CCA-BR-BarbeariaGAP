package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import javax.naming.directory.DirContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.dtos.UserDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

class LdapServiceAuthenticateRefreshTests {
    private MilitarRepository repository;
    private PasswordEncoder passwordEncoder;
    private AuthenticationService authService;
    private LdapService service;

    @BeforeEach
    void setup() {
        repository = mock(MilitarRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        authService = new AuthenticationService(
            repository,
            mock(TokenService.class),
            passwordEncoder,
            mock(AuthenticationManager.class)
        );
        service = spy(new LdapService(repository, authService));
    }

    @Test
    void existingUserGetsUpdatedFromLdapData() throws Exception {
        Militar existing = new Militar();
        existing.setCpf("123");
        existing.setNomeCompleto("Old");
        existing.setRole(UserRole.GRADUADO);

        when(repository.findByCpf("123")).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);
        when(passwordEncoder.encode("pass")).thenReturn("enc");

        UserDTO ldap = new UserDTO();
        ldap.setCpf("123");
        ldap.setNomeCompleto("New Name");
        ldap.setPostoGrad("SGT");
        ldap.setRole("GRADUADO");

        DirContext ctx = mock(DirContext.class);
        doReturn(ctx).when(service).createLdapContext(any());
        doReturn(List.of(ldap)).when(service).fetchLdapData(any(), eq(ctx));

        boolean result = service.authenticateLdap(new AuthenticationDTO("123", "pass"));

        assertTrue(result);
        verify(repository).save(existing);
        assertEquals("New Name", existing.getNomeCompleto());
        verify(passwordEncoder).encode("pass");
    }
}

