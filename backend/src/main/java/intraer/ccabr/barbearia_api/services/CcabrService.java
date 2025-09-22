package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.OmsResponse;
import intraer.ccabr.barbearia_api.dtos.UserDTO;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
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
                    String funcao = (String) response.get("funcao");
                    Object setorData = response.containsKey("Setor") ? response.get("Setor") : response.get("setor");
                    Object telefoneData = response.get("telefone");
                    Object ramalData = response.get("ramal");

                    List<TelefoneInfo> telefoneEntries = extractTelefoneEntries(telefoneData);
                    String telefoneNormalizado = formatTelefones(telefoneEntries);
                    String secaoResolvida = resolveSecao(response, funcao, setorData);
                    String ramalResolvido = resolveRamal(ramalData, telefoneEntries);

                    String secaoFinal = isBlank(secaoResolvida) ? "Não informado" : secaoResolvida;
                    String ramalFinal = isBlank(ramalResolvido) ? "Não informado" : ramalResolvido;

                    logger.debug(
                            "Valores brutos do webservice - funcao: {}, telefone: {}, setor: {}, ramal: {}",
                            funcao,
                            telefoneData,
                            setorData,
                            ramalData);
                    logger.debug(
                            "Valores mapeados - telefone: {}, secao: {}, ramal: {}",
                            telefoneNormalizado,
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

    private List<TelefoneInfo> extractTelefoneEntries(Object telefoneData) {
        List<TelefoneInfo> entries = new ArrayList<>();
        collectTelefoneEntries(telefoneData, entries);
        return entries;
    }

    private void collectTelefoneEntries(Object telefoneData, List<TelefoneInfo> entries) {
        if (telefoneData == null) {
            return;
        }

        if (telefoneData instanceof List<?> lista) {
            for (Object item : lista) {
                collectTelefoneEntries(item, entries);
            }
            return;
        }

        if (telefoneData instanceof Map<?, ?> mapa) {
            String numero = null;
            String ramal = null;

            for (Map.Entry<?, ?> entry : mapa.entrySet()) {
                Object keyObj = entry.getKey();
                Object value = entry.getValue();

                if (keyObj instanceof String chave) {
                    String chaveMin = chave.toLowerCase();

                    if (chaveMin.contains("numero") || chaveMin.contains("telefone")) {
                        if (value instanceof Map<?, ?> || value instanceof List<?>) {
                            collectTelefoneEntries(value, entries);
                        } else {
                            String candidato = asTrimmedString(value);
                            if (!isBlank(candidato) && isBlank(numero)) {
                                numero = candidato;
                            }
                        }
                    } else if (chaveMin.contains("ramal") || chaveMin.contains("extensao")) {
                        if (value instanceof Map<?, ?> || value instanceof List<?>) {
                            collectTelefoneEntries(value, entries);
                        } else {
                            String candidato = asTrimmedString(value);
                            if (!isBlank(candidato) && isBlank(ramal)) {
                                ramal = candidato;
                            }
                        }
                    } else if (value instanceof Map<?, ?> || value instanceof List<?>) {
                        collectTelefoneEntries(value, entries);
                    }
                } else if (value instanceof Map<?, ?> || value instanceof List<?>) {
                    collectTelefoneEntries(value, entries);
                }
            }

            if (!isBlank(numero) || !isBlank(ramal)) {
                entries.add(new TelefoneInfo(numero, ramal));
            }
            return;
        }

        String numero = asTrimmedString(telefoneData);
        if (!isBlank(numero)) {
            entries.add(new TelefoneInfo(numero, null));
        }
    }

    private String formatTelefones(List<TelefoneInfo> telefoneEntries) {
        List<String> numeros = new ArrayList<>();
        for (TelefoneInfo entry : telefoneEntries) {
            if (!isBlank(entry.numero())) {
                numeros.add(entry.numero());
            }
        }
        return numeros.isEmpty() ? null : String.join(", ", numeros);
    }

    private String resolveRamal(Object ramalData, List<TelefoneInfo> telefoneEntries) {
        String ramalDireto = asTrimmedString(ramalData);
        if (!isBlank(ramalDireto)) {
            return ramalDireto;
        }

        for (TelefoneInfo entry : telefoneEntries) {
            if (!isBlank(entry.ramal())) {
                return entry.ramal();
            }
        }

        for (TelefoneInfo entry : telefoneEntries) {
            if (!isBlank(entry.numero())) {
                return extractRamal(entry.numero());
            }
        }

        return "Não informado";
    }

    private String resolveSecao(Map<String, Object> response, String funcao, Object setorData) {
        List<String> nomesSetor = extractSetorNames(setorData);
        if (!nomesSetor.isEmpty()) {
            return nomesSetor.size() == 1 ? nomesSetor.get(0) : String.join(", ", nomesSetor);
        }

        String secaoDireta = asTrimmedString(response.get("secao"));
        if (!isBlank(secaoDireta)) {
            return secaoDireta;
        }

        return extractSecao(funcao);
    }

    private List<String> extractSetorNames(Object setorData) {
        List<String> nomes = new ArrayList<>();
        collectSetorNames(setorData, nomes);
        return nomes;
    }

    private void collectSetorNames(Object setorData, List<String> nomes) {
        if (setorData == null) {
            return;
        }

        if (setorData instanceof List<?> lista) {
            for (Object item : lista) {
                collectSetorNames(item, nomes);
            }
            return;
        }

        if (setorData instanceof Map<?, ?> mapa) {
            for (Map.Entry<?, ?> entry : mapa.entrySet()) {
                Object keyObj = entry.getKey();
                Object value = entry.getValue();

                if (keyObj instanceof String chave) {
                    String chaveMin = chave.toLowerCase();

                    if (chaveMin.contains("nome") || chaveMin.contains("descricao")) {
                        addStringIfNotBlank(nomes, value);
                    } else if ("setor".equalsIgnoreCase(chave)) {
                        collectSetorNames(value, nomes);
                    } else if (value instanceof Map<?, ?> || value instanceof List<?>) {
                        collectSetorNames(value, nomes);
                    }
                } else if (value instanceof Map<?, ?> || value instanceof List<?>) {
                    collectSetorNames(value, nomes);
                }
            }

            if (nomes.isEmpty() && mapa.size() == 1) {
                for (Object value : mapa.values()) {
                    addStringIfNotBlank(nomes, value);
                }
            }
            return;
        }

        addStringIfNotBlank(nomes, setorData);
    }

    private void addStringIfNotBlank(List<String> target, Object value) {
        if (value instanceof Map<?, ?> || value instanceof List<?>) {
            return;
        }

        String texto = asTrimmedString(value);
        if (!isBlank(texto)) {
            target.add(texto);
        }
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

    private record TelefoneInfo(String numero, String ramal) {}

    private String extractSecao(String funcao) {
        if (funcao != null && !funcao.trim().isEmpty()) {
            String[] parts = funcao.trim().split("\\s+");
            return parts.length > 0 ? parts[parts.length - 1] : "Não informado";
        }
        return "Não informado";
    }
    
    private String extractRamal(String telefone) {
        if (telefone != null && telefone.length() >= 4) {
            return telefone.substring(telefone.length() - 4);
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
