package intraer.ccabr.barbearia_api.infra.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import intraer.ccabr.barbearia_api.models.Militar;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class TokenService {

    private static final Logger logger = LoggerFactory.getLogger(TokenService.class);

    @Value("${api.secret.token.secret}")
    private String secret;

    // Método original que aceita um objeto Militar
    public String generateToken(Militar user) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(secret);
            logger.debug("ROLE QUE VEM NO AGENDAMENTO >>>>>>>>>>>>>>>>>>>>>{}", user.getRole().name());
            return JWT.create()
                    .withIssuer("barbearia-api")
                    .withSubject(user.getCpf())
                    .withClaim("id", user.getId())
                    .withClaim("saram", user.getSaram())
                    .withClaim("role", user.getRole().name())
                    .withClaim("postoGrad", user.getPostoGrad()) // 👈 Adicionado
                    .withClaim("om", user.getOm())               // 👈 Adicionado
                    .withClaim("nomeCompleto", user.getNomeCompleto()) // 👈 Novos claims
                    .withClaim("email", user.getEmail())
                    .sign(algorithm);
        } catch (JWTCreationException exception) {
            throw new RuntimeException("Erro ao gerar o token", exception);
        }
    }

    // // Novo método que aceita um CPF como String
    // public String generateToken(String cpf) {
    //     try {
    //         Algorithm algorithm = Algorithm.HMAC256(secret);
    //         return JWT.create()
    //                 .withIssuer("barbearia-api")
    //                 .withSubject(cpf)
    //                 // Não inclui o claim "role" porque não temos o objeto Militar aqui
    //                 // .withExpiresAt(genExpirationDate())
    //                 .sign(algorithm);
    //     } catch (JWTCreationException exception) {
    //         throw new RuntimeException("Erro ao gerar o token", exception);
    //     }
    // }

    public String validateToken(String token) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(secret);
            return JWT.require(algorithm)
                    .withIssuer("barbearia-api")
                    .build()
                    .verify(token)
                    .getSubject();
        } catch (JWTCreationException exception) {
            throw new RuntimeException("Token inválido ou expirado", exception);
        }
    }

    /*
    private Instant genExpirationDate() {
        return LocalDateTime.now().plusHours(1).toInstant(ZoneOffset.of("-03:00"));
    }
     */
}
