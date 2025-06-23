package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

public class AuthenticationServicePostoGradTests {
    private AuthenticationService service;

    @BeforeEach
    void setUp() {
        service = new AuthenticationService(
            Mockito.mock(MilitarRepository.class),
            Mockito.mock(TokenService.class),
            Mockito.mock(PasswordEncoder.class),
            Mockito.mock(AuthenticationManager.class)
        );
    }

    private boolean invokeIsOficial(String postoGrad) throws Exception {
        Method m = AuthenticationService.class.getDeclaredMethod("isOficial", String.class);
        m.setAccessible(true);
        return (Boolean) m.invoke(service, postoGrad);
    }

    private boolean invokeIsGraduado(String postoGrad) throws Exception {
        Method m = AuthenticationService.class.getDeclaredMethod("isGraduado", String.class);
        m.setAccessible(true);
        return (Boolean) m.invoke(service, postoGrad);
    }

    @Test
    void recognizesOficialIgnoringCaseAndSpaces() throws Exception {
        assertTrue(invokeIsOficial("ap"));
    }

    @Test
    void recognizesGraduadoIgnoringCaseAndSpaces() throws Exception {
        assertTrue(invokeIsGraduado("CB "));
    }
}
