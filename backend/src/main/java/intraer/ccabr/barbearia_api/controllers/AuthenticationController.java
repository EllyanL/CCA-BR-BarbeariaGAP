package intraer.ccabr.barbearia_api.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;
import jakarta.persistence.PersistenceException;

import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.dtos.LoginResponseDTO;
import intraer.ccabr.barbearia_api.dtos.UserDTO;
import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.services.AuthenticationService;
import intraer.ccabr.barbearia_api.services.WebserviceService;
import intraer.ccabr.barbearia_api.services.LdapService;
import jakarta.validation.Valid;

/**
 * Controlador REST responsável por gerenciar as operações de autenticação dos
 * usuários.
 * Fornece endpoints para login, busca de dados LDAP e dados locais de usuários.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationController.class);

    private final AuthenticationService authenticationService;

    private final LdapService ldapService;

    private final WebserviceService webserviceService;

    private final MilitarRepository militarRepository;

    private final PasswordEncoder passwordEncoder;

    private final TokenService tokenService;

    public AuthenticationController(
        AuthenticationService authenticationService,
        LdapService ldapService,
        WebserviceService webserviceService,
        MilitarRepository militarRepository,
        PasswordEncoder passwordEncoder,
        TokenService tokenService
    ) {
        this.authenticationService = authenticationService;
        this.ldapService = ldapService;
        this.webserviceService = webserviceService;
        this.militarRepository = militarRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    /**
     * Realiza o login de um usuário utilizando autenticação via LDAP.
     * Após a autenticação bem-sucedida, obtém os dados do militar do webservice (se
     * necessário)
     * e retorna um token JWT local junto com role, postoGrad e om.
     *
     * @param data Objeto contendo as credenciais do usuário (CPF e senha).
     * @return ResponseEntity contendo um LoginResponseDTO com token JWT, role,
     *         postoGrad e om
     *         se a autenticação for bem-sucedida; retorna 401 (UNAUTHORIZED) caso
     *         contrário.
     */
    @PostMapping("/login")
    @Transactional
    public ResponseEntity<LoginResponseDTO> login(@RequestBody @Valid AuthenticationDTO data) {
        logger.info("Tentando autenticar para CPF: {}", data.cpf());

        // ⚠️ Bypass para admin local
        if ("00000000000".equals(data.cpf())) {
            Optional<Militar> adminOpt = militarRepository.findByCpf(data.cpf());
            if (adminOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Militar admin = adminOpt.get();

            if (!passwordEncoder.matches(data.senha(), admin.getSenha())) {
                logger.warn("Senha incorreta para ADMIN.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String token = tokenService.generateToken(admin);
            logger.info("🔐 Token gerado para ADMIN local");

            return ResponseEntity.ok(new LoginResponseDTO(
                admin.getId(),
                token,
                admin.getCategoria().name(),
                admin.getPostoGrad(),
                admin.getOm(),
                admin.getNomeDeGuerra(),
                admin.getSaram(),
                admin.getNomeCompleto(),
                admin.getEmail(),
                admin.getSecao(),
                admin.getRamal()
            ));
        }

        Optional<Militar> militarBeforeAuthOpt = militarRepository.findByCpf(data.cpf());
        boolean militarExistedBeforeAuth = militarBeforeAuthOpt.isPresent();
        logger.debug("Estado pré-autenticação para CPF {}: existed={}.", data.cpf(), militarExistedBeforeAuth);

        // 🔐 Autenticação LDAP para os demais
        boolean ldapSuccess = ldapService.authenticateLdap(data);
        if (!ldapSuccess) {
            logger.warn("❌ Autenticação LDAP falhou.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Militar> userOpt = militarExistedBeforeAuth
            ? militarBeforeAuthOpt
            : militarRepository.findByCpf(data.cpf());

        Militar militar;
        boolean firstAccess = !militarExistedBeforeAuth;

        if (!firstAccess) {
            if (userOpt.isEmpty()) {
                firstAccess = true;
            } else {
                Militar existingMilitar = userOpt.get();
                boolean missingCategoria = existingMilitar.getCategoria() == null;
                boolean missingSecao = isMissingInfo(existingMilitar.getSecao());
                boolean missingRamal = isMissingInfo(existingMilitar.getRamal());
                if (missingCategoria || missingSecao || missingRamal) {
                    logger.info(
                        "📡 Sincronização necessária para CPF {} (categoria ausente: {}, secao ausente: {}, ramal ausente: {}).",
                        data.cpf(),
                        missingCategoria,
                        missingSecao,
                        missingRamal
                    );
                    firstAccess = true;
                }
            }
        }

        if (firstAccess) {
            CcabrUserDto militarData = webserviceService.fetchMilitarByCpf(data.cpf());
            logger.debug("📡 Dados do WebService recebidos: {}", militarData);
            if (militarData == null) {
                logger.error("❌ WebService não retornou dados para o CPF: {}", data.cpf());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }

            try {
                militar = authenticationService.createFromWebserviceData(militarData);
                logger.info("✅ Militar sincronizado com WebService.");
            } catch (DataAccessException | PersistenceException e) {
                logger.error("Erro ao persistir militar para CPF {}: {}", data.cpf(), e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        } else {
            militar = userOpt.get();
            logger.info("⏳ Usando dados locais para CPF: {}", militar.getCpf());
        }

        logger.info("📝 CPF: {}, ROLE: {}", militar.getCpf(), militar.getCategoria());

        // Geração de token
        String token = tokenService.generateToken(militar);
        logger.info("🔐 Token gerado para CPF: {}", militar.getCpf());

        return ResponseEntity.ok(new LoginResponseDTO(
            militar.getId(),
            token,
            militar.getCategoria().name(),
            militar.getPostoGrad(),
            militar.getOm(),
            militar.getNomeDeGuerra(),
            militar.getSaram(),
            militar.getNomeCompleto(),
            militar.getEmail(),
            militar.getSecao(),
            militar.getRamal()
        ));
    }

    /**
     * Busca os dados de um usuário no sistema LDAP.
     * Realiza a autenticação via LDAP usando as credenciais fornecidas e retorna as
     * informações do usuário.
     *
     * @param data Objeto contendo as credenciais do usuário (CPF e senha).
     * @return ResponseEntity contendo uma lista de UserDTO com as informações do
     *         usuário
     *         autenticado ou 401 (UNAUTHORIZED) em caso de falha.
     */
    @PostMapping("/ldap-data")
    public ResponseEntity<List<UserDTO>> getUserLdap(@RequestBody @Valid AuthenticationDTO data) {
        try {
            return ldapService.getUserLdap(data);
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }
    }

    /**
     * Recupera os dados de um usuário armazenados no banco de dados local.
     *
     * @param data Objeto contendo as credenciais do usuário (CPF e senha).
     * @return ResponseEntity contendo uma lista de UserDTO com as informações do
     *         usuário
     *         autenticado ou 401 (UNAUTHORIZED) em caso de falha.
     */
    @PostMapping("/user-data")
    public ResponseEntity<?> getUserData(@RequestBody @Valid AuthenticationDTO data) {
        return authenticationService.getUserData(data);
    }

    /**
     * Retorna os dados do usuário autenticado a partir do token informado.
     *
     * @param authentication contexto de autenticação injetado pelo Spring
     * @return UserDTO com as informações do usuário logado
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(Authentication authentication) {
        String cpf = authentication.getName();
        Militar militar = militarRepository.findByCpf(cpf)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário com CPF " + cpf + " não encontrado."));

        UserDTO dto = new UserDTO(
                militar.getId(),
                militar.getSaram(),
                militar.getNomeCompleto(),
                militar.getPostoGrad(),
                militar.getNomeDeGuerra(),
                militar.getEmail(),
                militar.getOm(),
                militar.getCpf()
        );
        dto.setCategoria(militar.getCategoria().name());
        dto.setQuadro(militar.getQuadro());
        dto.setSecao(militar.getSecao());
        dto.setRamal(militar.getRamal());

        return ResponseEntity.ok(dto);
    }

    private boolean isMissingInfo(String value) {
        if (value == null) {
            return true;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() || "Não informado".equalsIgnoreCase(trimmed);
    }
}
