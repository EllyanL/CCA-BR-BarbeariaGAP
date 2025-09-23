package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.dtos.UserDTO;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

@ExtendWith(MockitoExtension.class)
class WebserviceServiceTest {

    @Mock private CcabrService ccabrService;

    private MutableClock clock;
    private WebserviceService webserviceService;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2024-01-01T00:00:00Z"));
        webserviceService = new WebserviceService(ccabrService, clock);
    }

    @Test
    void fetchMilitarByCpfShouldReuseCachedTokenWhenNotExpired() {
        String cpf = "12345678901";
        UserDTO user = buildUser(cpf, "token-1");
        CcabrService.AuthToken authToken = new CcabrService.AuthToken("token-1", clock.instant().plusSeconds(3600));

        when(ccabrService.authenticateWebService()).thenReturn(Mono.just(authToken));
        when(ccabrService.buscarMilitar(cpf, "token-1")).thenReturn(Mono.just(user));

        CcabrUserDto result1 = webserviceService.fetchMilitarByCpf(cpf);
        CcabrUserDto result2 = webserviceService.fetchMilitarByCpf(cpf);

        assertNotNull(result1);
        assertEquals(result1.getCpf(), result2.getCpf());

        verify(ccabrService, times(1)).authenticateWebService();
        verify(ccabrService, times(2)).buscarMilitar(cpf, "token-1");
    }

    @Test
    void fetchMilitarByCpfShouldRefreshTokenWhenExpiredByTime() {
        String cpf = "23456789012";
        UserDTO user1 = buildUser(cpf, "token-1");
        UserDTO user2 = buildUser(cpf, "token-2");

        Instant initialInstant = clock.instant();
        CcabrService.AuthToken firstToken = new CcabrService.AuthToken("token-1", initialInstant.plusSeconds(30));
        CcabrService.AuthToken secondToken = new CcabrService.AuthToken("token-2", initialInstant.plusSeconds(120));

        when(ccabrService.authenticateWebService())
                .thenReturn(Mono.just(firstToken))
                .thenReturn(Mono.just(secondToken));
        when(ccabrService.buscarMilitar(cpf, "token-1")).thenReturn(Mono.just(user1));
        when(ccabrService.buscarMilitar(cpf, "token-2")).thenReturn(Mono.just(user2));

        CcabrUserDto firstResult = webserviceService.fetchMilitarByCpf(cpf);
        assertEquals("token-1", firstResult.getSaram());

        clock.advance(Duration.ofSeconds(60));

        CcabrUserDto secondResult = webserviceService.fetchMilitarByCpf(cpf);
        assertEquals("token-2", secondResult.getSaram());

        verify(ccabrService, times(2)).authenticateWebService();
        verify(ccabrService, times(1)).buscarMilitar(cpf, "token-1");
        verify(ccabrService, times(1)).buscarMilitar(cpf, "token-2");
    }

    @Test
    void fetchMilitarByCpfShouldRenewTokenAfterUnauthorized() {
        String cpf = "34567890123";
        UserDTO user = buildUser(cpf, "token-2");

        CcabrService.AuthToken initialToken = new CcabrService.AuthToken("token-1", clock.instant().plusSeconds(3600));
        CcabrService.AuthToken renewedToken = new CcabrService.AuthToken("token-2", clock.instant().plusSeconds(3600));

        WebClientResponseException unauthorized = WebClientResponseException.Unauthorized.create(
                HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized",
                HttpHeaders.EMPTY,
                new byte[0],
                StandardCharsets.UTF_8);

        when(ccabrService.authenticateWebService())
                .thenReturn(Mono.just(initialToken))
                .thenReturn(Mono.just(renewedToken));
        when(ccabrService.buscarMilitar(cpf, "token-1")).thenReturn(Mono.error(unauthorized));
        when(ccabrService.buscarMilitar(cpf, "token-2")).thenReturn(Mono.just(user));

        CcabrUserDto result = webserviceService.fetchMilitarByCpf(cpf);

        assertNotNull(result);
        assertEquals("token-2", result.getSaram());

        verify(ccabrService, times(2)).authenticateWebService();
        verify(ccabrService, times(1)).buscarMilitar(cpf, "token-1");
        verify(ccabrService, times(1)).buscarMilitar(cpf, "token-2");
    }

    private UserDTO buildUser(String cpf, String saram) {
        UserDTO user = new UserDTO();
        user.setId(1L);
        user.setCpf(cpf);
        user.setSaram(saram);
        user.setNomeCompleto("Fulano Teste");
        user.setPostoGrad("CB");
        user.setNomeDeGuerra("Fulano");
        user.setEmail("fulano@example.com");
        user.setOm("OM-1");
        user.setQuadro("Q01");
        user.setSecao("SEC");
        user.setRamal("1234");
        user.setCategoria("USER");
        return user;
    }

    private static class MutableClock extends Clock {

        private Instant current;
        private final ZoneId zone;

        private MutableClock(Instant initial) {
            this(initial, ZoneOffset.UTC);
        }

        private MutableClock(Instant initial, ZoneId zone) {
            this.current = initial;
            this.zone = zone;
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(current, zone);
        }

        @Override
        public Instant instant() {
            return current;
        }

        void advance(Duration duration) {
            current = current.plus(duration);
        }
    }
}
