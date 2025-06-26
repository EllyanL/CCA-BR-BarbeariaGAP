package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.*;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.naming.Context;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.*;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.Optional;

import jakarta.validation.Valid;

@Service
public class LdapService {
    private static final Logger logger = LoggerFactory.getLogger(LdapService.class);
    @Value("${spring.ldap.base}")
    private String ldapBase;

    @Value("${spring.ldap.urls}")
    private String ldapHost;

    private final MilitarRepository militarRepository;

    private final TokenService tokenService;

    private final AuthenticationService authenticationService;

    public LdapService(MilitarRepository militarRepository, TokenService tokenService, AuthenticationService authenticationService) {
        this.militarRepository = militarRepository;
        this.tokenService = tokenService;
        this.authenticationService = authenticationService;
    }

    /**
     * Obtém os dados do usuário a partir do LDAP.
     *
     * @param data Objeto que contém as credenciais do usuário, incluindo login/cpf e senha.
     * @return ResponseEntity contendo uma lista de {@link UserDTO} com os dados do usuário se a
     *         autenticação for bem-sucedida; caso contrário, retorna um status 500
     *         (INTERNAL_SERVER_ERROR) em caso de erro na comunicação com o LDAP.
     */
    public ResponseEntity<List<UserDTO>> getUserLdap(@RequestBody @Valid AuthenticationDTO data) {
        DirContext ctx = null;
        try {
            ctx = createLdapContext(data);
            List<UserDTO> ldapDataList = fetchLdapData(data, ctx);
            return ResponseEntity.ok(ldapDataList);
        } catch (NamingException e) {
            logger.error("Erro ao buscar dados no LDAP: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } finally {
            if (ctx != null) {
                try {
                    ctx.close();
                } catch (NamingException e) {
                    logger.error("Erro ao fechar o contexto LDAP: {}", e.getMessage());
                }
            }
        }
    }

    /**
     * Recupera os dados do usuário do LDAP com base nas credenciais fornecidas.
     *
     * @param data Dados de autenticação (login e senha).
     * @param ctx  Contexto LDAP.
     * @return Lista de {@link UserDTO} contendo os dados do usuário recuperados do LDAP.
     * @throws NamingException Se ocorrer um erro durante a busca no LDAP.
     */
    private List<UserDTO> fetchLdapData(AuthenticationDTO data, DirContext ctx) throws NamingException {
        List<UserDTO> ldapDataList = new ArrayList<>();
        NamingEnumeration<SearchResult> results = ctx.search(ldapBase, "(uid=" + data.cpf() + ")", createSearchControls());

        while (results.hasMore()) {
            SearchResult searchResult = results.next();
            ldapDataList.add(mapLdapAttributesToDto(searchResult.getAttributes()));
        }
        logger.debug("Dados encontrados no LDAP para CPF {}: {}", data.cpf(), ldapDataList);
        return ldapDataList;
    }

    /**
     * Autentica o usuário via LDAP usando as credenciais fornecidas.
     *
     * @param data Dados de autenticação (CPF e senha).
     * @return ResponseEntity contendo um LoginResponseDTO com o token JWT se
     *         a autenticação LDAP for bem-sucedida; retorna erro em caso de falha.
     */
    public ResponseEntity<LoginResponseDTO> authenticateLdap(AuthenticationDTO data) {
        DirContext ctx = null;
        try {
            ctx = createLdapContext(data);
            List<UserDTO> ldapDataList = fetchLdapData(data, ctx);
    
            if (ldapDataList.isEmpty()) {
                logger.warn("❌ Nenhum usuário encontrado no LDAP para CPF: {}", data.cpf());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
    
            Optional<Militar> userOpt = militarRepository.findByCpf(data.cpf());
            Militar militar;
    
            if (userOpt.isEmpty()) {
                logger.info("📌 Usuário não encontrado no banco. Registrando novo...");
    
                UserDTO ldapData = ldapDataList.get(0);
                RegisterDTO registerDTO = new RegisterDTO();
                registerDTO.setSaram(ldapData.getSaram());
                registerDTO.setNomeCompleto(ldapData.getNomeCompleto());
                registerDTO.setPostoGrad(ldapData.getPostoGrad());
                registerDTO.setNomeDeGuerra(ldapData.getNomeDeGuerra());
                registerDTO.setEmail(ldapData.getEmail());
                registerDTO.setOm(ldapData.getOm());
                registerDTO.setCpf(data.cpf());
                registerDTO.setSenha(data.senha());
    
                Optional<Militar> registrado = authenticationService.registerNewUser(registerDTO);
                if (registrado.isEmpty()) {
                    logger.error("❌ Erro ao registrar novo usuário no banco.");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                }
    
                militar = registrado.get();
                logger.info("✅ Usuário registrado com sucesso no banco. CPF: {}", militar.getCpf());
    
            } else {
                militar = userOpt.get();
                logger.info("✅ Usuário já existente no banco. CPF: {}", militar.getCpf());
            }
    
            // Geração do token
            String token = tokenService.generateToken(militar);
            logger.debug("🔐 Token gerado com sucesso: {}", token);
    
            return ResponseEntity.ok(new LoginResponseDTO(token));
    
        } catch (NamingException e) {
            logger.error("❌ Erro LDAP ao autenticar CPF {}: {}", data.cpf(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    
        } finally {
            if (ctx != null) {
                try {
                    ctx.close();
                } catch (NamingException e) {
                    logger.error("Erro ao fechar contexto LDAP: {}", e.getMessage());
                }
            }
        }
    }    

    /**
     * Cria e configura um contexto LDAP para autenticação.
     *
     * @param data Dados de autenticação (login e senha).
     * @return DirContext configurado para o LDAP.
     * @throws NamingException Se ocorrer um erro ao criar o contexto.
     */
    private DirContext createLdapContext(AuthenticationDTO data) throws NamingException {
        Hashtable<String, String> env = new Hashtable<>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
        env.put(Context.PROVIDER_URL, this.ldapHost);
        env.put(Context.SECURITY_AUTHENTICATION, "simple");
        env.put(Context.SECURITY_PRINCIPAL, "uid=" + data.cpf() + "," + this.ldapBase);
        env.put(Context.SECURITY_CREDENTIALS, data.senha());
        return new InitialDirContext(env);
    }

    /**
     * Cria os controles de busca para a pesquisa LDAP.
     *
     * @return Um objeto {@link SearchControls} configurado com o escopo da pesquisa como SUBTREE_SCOPE.
     */
    private SearchControls createSearchControls() {
        SearchControls searchControls = new SearchControls();
        searchControls.setSearchScope(SearchControls.SUBTREE_SCOPE);
        return searchControls;
    }

    /**
     * Mapeia os atributos LDAP recuperados para um objeto {@link UserDTO}.
     *
     * @param attrs Atributos do usuário recuperados do LDAP.
     * @return Um objeto {@link UserDTO} com os atributos mapeados.
     * @throws NamingException Se ocorrer um erro ao acessar os atributos.
     */
    private UserDTO mapLdapAttributesToDto(Attributes attrs) throws NamingException {
        UserDTO ldapData = new UserDTO();
        ldapData.setSaram(getAttribute(attrs, "FABnrordem")); // SARAM
        ldapData.setNomeCompleto(getAttribute(attrs, "cn")); // Nome Completo
        ldapData.setPostoGrad(getAttribute(attrs, "FABpostograd")); // Posto ou Graduação
        ldapData.setNomeDeGuerra(getAttribute(attrs, "FABguerra")); // Nome de Guerra
        ldapData.setEmail(getAttribute(attrs, "mail")); // Email
        ldapData.setOm(getAttribute(attrs, "FABom")); // OM
        ldapData.setCpf(getAttribute(attrs, "uid")); // CPF
        return ldapData;
    }

    /**
     * Obtém o valor de um atributo específico das Attributes LDAP.
     *
     * @param attrs         Atributos LDAP.
     * @param attributeName Nome do atributo a ser obtido.
     * @return Valor do atributo como String ou null se o atributo não existir.
     * @throws NamingException Se ocorrer um erro ao acessar o atributo.
     */
    private String getAttribute(Attributes attrs, String attributeName) throws NamingException {
        Attribute attr = attrs.get(attributeName);
        return (attr != null) ? (String) attr.get() : null;
    }
}
