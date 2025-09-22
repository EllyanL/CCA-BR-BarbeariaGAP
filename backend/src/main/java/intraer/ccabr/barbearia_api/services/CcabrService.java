package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.OmsResponse;
import intraer.ccabr.barbearia_api.dtos.UserDTO;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Serviço responsável por realizar chamadas ao webservice CCABR para autenticação,
 * busca de ordens de missão (OMS) e dados de militares.
 */
@Service
public class CcabrService {

    private static final Logger logger = LoggerFactory.getLogger(CcabrService.class);

    private final WebClient webClient;

    @Value("${webservice.username}")
    private String username;

    @Value("${webservice.password}")
    private String password;

    public CcabrService(WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<List<OmsResponse>> buscarOms() {
        return webClient.get()
                .uri("/oms")
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        Mono.error(new RuntimeException("Erro 4xx: " + response.statusCode())))
                .onStatus(status -> status.is5xxServerError(), response ->
                        Mono.error(new RuntimeException("Erro 5xx: " + response.statusCode())))
                .bodyToMono(new ParameterizedTypeReference<List<OmsResponse>>() {})
                .doOnSubscribe(sub -> logger.info("Iniciando chamada ao endpoint /api/oms"))
                .doOnSuccess(response -> logger.debug("Resposta recebida: {}", response))
                .doOnError(error -> logger.error("Erro na chamada ao webservice: {}", error.getMessage()));
    }

    /**
     * Realiza a autenticação no webservice e retorna o token Bearer.
     *
     * @return Mono<String> contendo o token Bearer ou erro em caso de falha.
     */
    public Mono<String> authenticateWebService() {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("username", username);
        credentials.put("password", password);
    
        return webClient.post()
                .uri("/login")
                .bodyValue(credentials)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        Mono.error(new RuntimeException("Erro 4xx na autenticação: " + response.statusCode())))
                .onStatus(status -> status.is5xxServerError(), response ->
                        Mono.error(new RuntimeException("Erro 5xx na autenticação: " + response.statusCode())))
                .bodyToMono(new ParameterizedTypeReference<Map<String, String>>() {})
                .map(response -> {
                    String token = response.get("access_token");
                    if (token == null) {
                        logger.error("Token não encontrado na resposta: {}", response);
                        throw new RuntimeException("Token (access_token) não retornado pelo webservice");
                    }
                    return token;
                })
                .doOnSubscribe(sub -> logger.info("Iniciando autenticação no webservice"))
                .doOnSuccess(token -> logger.debug("Token Bearer recebido: {}", token))
                .doOnError(error -> logger.error("Erro na autenticação do webservice: {}", error.getMessage()));
    }

    /**
     * Busca os dados do militar no webservice usando o CPF e o token Bearer.
     *
     * @param cpf O CPF do militar.
     * @param bearerToken O token Bearer para autenticação.
     * @return Mono<UserDTO> contendo os dados do militar.
     */
    public Mono<UserDTO> buscarMilitar(String cpf, String bearerToken) {
        return webClient.get()
                .uri("/militares/{cpf}", cpf)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), response ->
                        Mono.error(new RuntimeException("Erro 4xx: " + response.statusCode())))
                .onStatus(status -> status.is5xxServerError(), response ->
                        Mono.error(new RuntimeException("Erro 5xx: " + response.statusCode())))
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .map(response -> {
                    logger.debug("Resposta completa do webservice para CPF {}: {}", cpf, response);
                    UserDTO userDTO = new UserDTO();
                    userDTO.setSaram((String) response.get("saram"));
                    userDTO.setNomeCompleto((String) response.get("nome_completo"));
                    userDTO.setPostoGrad((String) response.get("posto"));
                    userDTO.setNomeDeGuerra((String) response.get("nome_guerra"));
                    userDTO.setEmail((String) response.get("email"));
                    String omBruta = (String) response.get("organizacao");
                    userDTO.setOm(omBruta != null ? omBruta.trim().replace(" ", "-") : "Não informado");
                    userDTO.setCpf((String) response.get("cpf"));
                    userDTO.setQuadro((String) response.get("quadro"));
                    String funcao = asTrimmedString(response.get("funcao"));
                    Object secaoData = response.get("secao");
                    Object setorData = response.containsKey("Setor") ? response.get("Setor") : response.get("setor");
                    Object telefoneData = response.get("telefone");

                    String secaoFinal = resolveSecao(setorData, secaoData, funcao);
                    String ramalFinal = resolveRamal(telefoneData);

                    logger.debug(
                            "Valores brutos do webservice - telefone: {}, setor: {}",
                            telefoneData,
                            setorData);
                    logger.debug(
                            "Valores mapeados - secao: {}, ramal: {}",
                            secaoFinal,
                            ramalFinal);

                    userDTO.setSecao(secaoFinal);
                    userDTO.setRamal(ramalFinal);
                    userDTO.setCategoria(mapRole((String) response.get("posto"), (String) response.get("pessfis_type")));
                    logger.debug("Valores mapeados - secao: {}, ramal: {}", userDTO.getSecao(), userDTO.getRamal());
                    return userDTO;
                })
                .doOnSubscribe(sub -> logger.info("Iniciando busca de militar para CPF: {}", cpf))
                .doOnSuccess(militar -> logger.debug("Dados do militar recebidos: {}", militar))
                .doOnError(error -> logger.error("Erro na busca do militar: {}", error.getMessage()));
    }

    private String resolveSecao(Object setorData, Object secaoData, String funcao) {
        String secao = extractPrimeiroSetor(setorData);
        if (!isBlank(secao)) {
            return secao;
        }

        String secaoDireta = asTrimmedString(secaoData);
        if (!isBlank(secaoDireta)) {
            return secaoDireta;
        }

        String secaoDerivada = deriveSecaoFromFuncao(funcao);
        return isBlank(secaoDerivada) ? "Não informado" : secaoDerivada;
    }

    private String deriveSecaoFromFuncao(String funcao) {
        if (isBlank(funcao)) {
            return null;
        }

        String trimmed = funcao.trim();
        String upper = trimmed.toUpperCase();
        int idx = upper.lastIndexOf("SEC");
        if (idx >= 0) {
            boolean boundaryBefore = idx == 0 || !Character.isLetterOrDigit(upper.charAt(idx - 1));
            boolean boundaryAfter = idx + 3 >= upper.length() || !Character.isLetterOrDigit(upper.charAt(idx + 3));
            if (boundaryBefore && boundaryAfter) {
                int start = idx + 3;
                while (start < trimmed.length() && !Character.isLetterOrDigit(trimmed.charAt(start))) {
                    start++;
                }
                if (start < trimmed.length()) {
                    String candidate = stripNonAlphanumericEdges(trimmed.substring(start));
                    if (!isBlank(candidate) && !candidate.equalsIgnoreCase("SEC")) {
                        return candidate;
                    }
                }
            }
        }

        String cleaned = stripNonAlphanumericEdges(trimmed);
        if (isBlank(cleaned) || cleaned.equalsIgnoreCase("SEC")) {
            return null;
        }

        int lastSpace = cleaned.lastIndexOf(' ');
        if (lastSpace >= 0 && lastSpace + 1 < cleaned.length()) {
            String candidate = stripNonAlphanumericEdges(cleaned.substring(lastSpace + 1));
            if (!isBlank(candidate) && !candidate.equalsIgnoreCase("SEC")) {
                return candidate;
            }
        }

        return cleaned;
    }

    private String stripNonAlphanumericEdges(String value) {
        if (value == null) {
            return null;
        }

        int start = 0;
        int end = value.length();

        while (start < end && !Character.isLetterOrDigit(value.charAt(start))) {
            start++;
        }

        while (end > start && !Character.isLetterOrDigit(value.charAt(end - 1))) {
            end--;
        }

        if (start >= end) {
            return null;
        }

        return value.substring(start, end).trim();
    }

    private String extractPrimeiroSetor(Object setorData) {
        if (setorData == null) {
            return null;
        }

        if (setorData instanceof List<?> lista) {
            for (Object item : lista) {
                String valor = extractPrimeiroSetor(item);
                if (!isBlank(valor)) {
                    return valor;
                }
            }
            return null;
        }

        if (setorData instanceof Map<?, ?> mapa) {
            for (Map.Entry<?, ?> entry : mapa.entrySet()) {
                Object chave = entry.getKey();
                Object valor = entry.getValue();

                if (chave instanceof String chaveTexto) {
                    String chaveNormalizada = chaveTexto.toLowerCase();
                    if (chaveNormalizada.contains("nome") || chaveNormalizada.contains("descricao")) {
                        String texto = asTrimmedString(valor);
                        if (!isBlank(texto)) {
                            return texto;
                        }
                    }
                }

                String texto = extractPrimeiroSetor(valor);
                if (!isBlank(texto)) {
                    return texto;
                }
            }
            return null;
        }

        return asTrimmedString(setorData);
    }

    private String resolveRamal(Object telefoneData) {
        String telefone = extractTelefone(telefoneData);
        if (isBlank(telefone)) {
            return "Não informado";
        }
        return extractRamal(telefone);
    }

    private String extractTelefone(Object telefoneData) {
        if (telefoneData == null) {
            return null;
        }

        if (telefoneData instanceof List<?> lista) {
            for (Object item : lista) {
                String telefone = extractTelefone(item);
                if (!isBlank(telefone)) {
                    return telefone;
                }
            }
            return null;
        }

        if (telefoneData instanceof Map<?, ?> mapa) {
            for (Object value : mapa.values()) {
                String telefone = extractTelefone(value);
                if (!isBlank(telefone)) {
                    return telefone;
                }
            }
            return null;
        }

        return asTrimmedString(telefoneData);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String asTrimmedString(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof String texto) {
            String trim = texto.trim();
            return trim.isEmpty() ? null : trim;
        }

        String texto = value.toString().trim();
        return texto.isEmpty() ? null : texto;
    }

    private String extractRamal(String telefone) {
        if (telefone == null) {
            return "Não informado";
        }

        String apenasDigitos = telefone.replaceAll("\\D", "");
        if (apenasDigitos.length() >= 4) {
            return apenasDigitos.substring(apenasDigitos.length() - 4);
        }

        return "Não informado";
    }
    
    private String mapRole(String posto, String pessfisType) {
        logger.debug("Determinando categoria para posto: {}, pessfisType: {}", posto, pessfisType);

        if (pessfisType != null && !pessfisType.trim().isEmpty()) {
            String type = pessfisType.trim().toUpperCase();
            if ("CIVIL".equals(type) || "SERVIDOR CIVIL".equals(type)) {
                logger.debug("Categoria determinada: USER");
                return "USER";
            }
        }

        if (posto != null && !posto.trim().isEmpty()) {
            String normalized = posto.trim().toUpperCase();
            List<String> oficiais = List.of(
                    "AP", "ASP",
                    "2T", "2TEN",
                    "1T", "1TEN",
                    "CP", "CAP",
                    "MJ", "MAJ",
                    "TC",
                    "CL", "CEL",
                    "BG", "MB", "TB");

            List<String> graduados = List.of(
                    "SO",
                    "1S", "S1",
                    "2S", "S2",
                    "3S", "S3",
                    "CB",
                    "SD");

            if (oficiais.contains(normalized)) {
                logger.debug("Categoria determinada por posto: OFICIAL");
                return "OFICIAL";
            }
            if (graduados.contains(normalized)) {
                logger.debug("Categoria determinada por posto: GRADUADO");
                return "GRADUADO";
            }
        }

        logger.error("Não foi possível determinar categoria para posto: {} e pessfisType: {}", posto, pessfisType);
        throw new IllegalArgumentException("Não foi possível determinar categoria do militar");
    }
       

}
