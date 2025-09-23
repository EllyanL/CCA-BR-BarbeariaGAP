package intraer.ccabr.barbearia_api.services;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.dtos.UserDTO;

import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

/**
 * Serviço que encapsula as chamadas ao webservice do CCA-BR para obtenção de
 * dados de militares.
 */
@Service
public class WebserviceService {

    private static final Logger logger = LoggerFactory.getLogger(WebserviceService.class);

    private final CcabrService ccabrService;
    private final Clock clock;
    private final AtomicReference<TokenCache> cachedToken = new AtomicReference<>();

    public WebserviceService(CcabrService ccabrService) {
        this(ccabrService, Clock.systemUTC());
    }

    WebserviceService(CcabrService ccabrService, Clock clock) {
        this.ccabrService = ccabrService;
        this.clock = clock;
    }

    /**
     * Busca os dados de um militar no webservice CCABR utilizando o CPF.
     *
     * @param cpf CPF do militar
     * @return {@link CcabrUserDto} com os dados obtidos ou {@code null} caso não
     *         seja possível recuperar as informações
     */
    public CcabrUserDto fetchMilitarByCpf(String cpf) {
        UserDTO data = buscarMilitarComTokenRenovado(cpf)
                .blockOptional()
                .orElse(null);
        logger.debug("📡 Dados do WebService recebidos: {}", data);
        if (data == null) {
            return null;
        }
        return mapToDto(data);
    }

    private Mono<UserDTO> buscarMilitarComTokenRenovado(String cpf) {
        return obterTokenValido()
                .flatMap(token -> ccabrService.buscarMilitar(cpf, token)
                        .onErrorResume(WebClientResponseException.Unauthorized.class, ex -> {
                            logger.warn(
                                    "Token expirado ou inválido detectado durante a busca do CPF {}. Renovando token.",
                                    cpf);
                            invalidateToken();
                            return renovarToken().flatMap(novoToken -> ccabrService.buscarMilitar(cpf, novoToken));
                        }));
    }

    private Mono<String> obterTokenValido() {
        return Mono.defer(() -> {
            TokenCache atual = cachedToken.get();
            if (atual != null && atual.isValid(now())) {
                logger.debug("Reutilizando token do webservice válido até {}", atual.expiresAt());
                return Mono.just(atual.token());
            }
            logger.debug("Token do webservice ausente ou expirado. Solicitando novo token.");
            return renovarToken();
        });
    }

    private Mono<String> renovarToken() {
        return ccabrService.authenticateWebService()
                .map(authToken -> {
                    TokenCache novoCache = new TokenCache(authToken.token(), authToken.expiresAt());
                    cachedToken.set(novoCache);
                    logger.debug(
                            "Novo token do webservice armazenado com expiração em {}",
                            novoCache.expiresAt());
                    return novoCache.token();
                });
    }

    private void invalidateToken() {
        cachedToken.set(null);
    }

    private Instant now() {
        return Instant.now(clock);
    }

    private CcabrUserDto mapToDto(UserDTO data) {
        CcabrUserDto dto = new CcabrUserDto();
        dto.setId(data.getId());
        dto.setSaram(data.getSaram());
        dto.setNomeCompleto(data.getNomeCompleto());
        dto.setPostoGrad(data.getPostoGrad());
        dto.setNomeDeGuerra(data.getNomeDeGuerra());
        dto.setEmail(data.getEmail());
        dto.setOm(data.getOm());
        dto.setCpf(data.getCpf());
        dto.setQuadro(data.getQuadro());
        dto.setSecao(data.getSecao());
        dto.setRamal(data.getRamal());
        dto.setCategoria(data.getCategoria());
        return dto;
    }

    private record TokenCache(String token, Instant expiresAt) {
        boolean isValid(Instant now) {
            return token != null && expiresAt != null && expiresAt.isAfter(now);
        }
    }
}
