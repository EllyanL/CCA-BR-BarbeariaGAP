package intraer.ccabr.barbearia_api.infra.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.algorithms.Algorithm;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.enums.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

public class TokenServiceTests {

    @Test
    void generatedTokenContainsNomeCompletoAndEmail() {
        TokenService service = new TokenService();
        ReflectionTestUtils.setField(service, "secret", "test-secret");

        Militar m = new Militar();
        m.setId(1L);
        m.setCpf("123456789");
        m.setSaram("9999");
        m.setCategoria(UserRole.GRADUADO);
        m.setPostoGrad("SGT");
        m.setOm("OM");
        m.setNomeCompleto("Nome Completo");
        m.setEmail("teste@example.com");

        String token = service.generateToken(m);

        DecodedJWT decoded = JWT.require(Algorithm.HMAC256("test-secret"))
                .withIssuer("barbearia-api")
                .build()
                .verify(token);

        assertEquals("Nome Completo", decoded.getClaim("nomeCompleto").asString());
        assertEquals("teste@example.com", decoded.getClaim("email").asString());
    }
}
