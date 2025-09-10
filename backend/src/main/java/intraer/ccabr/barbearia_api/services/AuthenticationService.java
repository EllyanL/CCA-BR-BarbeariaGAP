package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.UserDTO;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.dtos.AuthenticationDTO;
import intraer.ccabr.barbearia_api.dtos.LoginResponseDTO;
import intraer.ccabr.barbearia_api.dtos.RegisterDTO;
import intraer.ccabr.barbearia_api.dtos.CcabrUserDto;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Serviço responsável por gerenciar a autenticação local e operações relacionadas aos usuários.
 */
@Service
public class AuthenticationService {

    private final MilitarRepository militarRepository;

    private final TokenService tokenService;

    private final PasswordEncoder passwordEncoder;

    private final AuthenticationManager authenticationManager;

    private static final String ADMIN_CPF = "00000000000";
    private static final String LDAP_AUTH_PLACEHOLDER = "Autenticado no LDAP";

    public AuthenticationService(
        MilitarRepository militarRepository,
        TokenService tokenService,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager
    ) {
        this.militarRepository = militarRepository;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Autentica um usuário com a função de ADMIN.
     *
     * @param data Objeto que contém as credenciais do usuário, incluindo CPF e senha.
     * @return Um {@link ResponseEntity<LoginResponseDTO>} com o token JWT se o
     *         usuário for ADMIN e as credenciais forem válidas;
     *         caso contrário, retorna um ResponseEntity com status UNAUTHORIZED.
     */
    public ResponseEntity<LoginResponseDTO> authenticateAdmin(AuthenticationDTO data) {
        try {
            // Busca o usuário pelo CPF
            Optional<Militar> userOpt = militarRepository.findByCpf(data.cpf());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Militar user = userOpt.get();

            // Verifica se o usuário existe, se a senha é válida e se ele é ADMIN
            if (user != null && user.getCategoria() == UserRole.ADMIN && passwordEncoder.matches(data.senha(), user.getSenha())) {
                String token = tokenService.generateToken(user);
                return ResponseEntity.ok(new LoginResponseDTO(token));
            }

            // Retorna UNAUTHORIZED caso qualquer condição falhe
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Autentica o usuário localmente usando as credenciais fornecidas.
     *
     * @param data Dados de autenticação (CPF e senha).
     * @return Resposta contendo o token JWT se a autenticação local for bem-sucedida;
     *         caso contrário, retorna null para permitir a próxima tentativa.
     */
    public ResponseEntity<LoginResponseDTO> authenticateLocally(AuthenticationDTO data) {
        try {
            var usernamePassword = new UsernamePasswordAuthenticationToken(data.cpf(), data.senha());
            var auth = this.authenticationManager.authenticate(usernamePassword);
            var token = tokenService.generateToken((Militar) auth.getPrincipal());
            return ResponseEntity.ok(new LoginResponseDTO(token));
        } catch (AuthenticationException e) {
            // Captura a exceção de autenticação e retorna null para tentar outra abordagem
            return null;
        }
    }

    /**
     * Recupera os dados de um usuário autenticado armazenados no banco de dados local.
     *
     * @param data Objeto contendo as credenciais do usuário (CPF e senha).
     * @return ResponseEntity contendo uma lista de UserDTO com as informações do usuário
     *         autenticado, 404 (NOT_FOUND) se o usuário não for encontrado, ou 500 (INTERNAL_SERVER_ERROR)
     *         em caso de falha no servidor.
     */
    public ResponseEntity<List<UserDTO>> getUserData(@RequestBody @Valid AuthenticationDTO data) {
        try {
            // Autenticação com CPF e senha
            Authentication authentication = new UsernamePasswordAuthenticationToken(data.cpf(), data.senha());
            Authentication authenticated = authenticationManager.authenticate(authentication);

            // Recupera o UserDetails diretamente como uma instância de Militar
            UserDetails userDetails = (UserDetails) authenticated.getPrincipal();
            Militar user = (Militar) userDetails;

            // Mapeia os dados do usuário para o DTO
            UserDTO userDTO = new UserDTO(
                    user.getId(),
                    user.getSaram(),
                    user.getNomeCompleto(),
                    user.getPostoGrad(),
                    user.getNomeDeGuerra(),
                    user.getEmail(),
                    user.getOm(),
                    user.getCpf()
            );

            // Retorna os dados do usuário dentro de uma lista
            return ResponseEntity.ok(Collections.singletonList(userDTO));

        } catch (UsernameNotFoundException e) {
            // Retorna 404 com lista vazia se o usuário não for encontrado
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        } catch (Exception e) {
            // Tratamento genérico de erro, retorna 500 com lista vazia
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    /**
 * Registra um novo usuário localmente com base nos dados fornecidos e no
 * posto/graduação do militar.
 *
 * @param data Dados de autenticação (login e senha) do novo usuário.
 * @return Um objeto {@link UserDetails} representando o usuário
 *         recém-registrado.
 */
    public Optional<Militar> registerNewUser(RegisterDTO data) {
    UserRole role;
    if (isOficial(data.getPostoGrad())) {
        role = UserRole.OFICIAL;
    } else if (isGraduado(data.getPostoGrad())) {
        role = UserRole.GRADUADO;
    } else {
        role = UserRole.USER;
    }

    Militar user = new Militar(
            data.getSaram(),
            data.getNomeCompleto(),
            data.getPostoGrad(),
            data.getNomeDeGuerra(),
            data.getEmail(),
            data.getOm(),
            data.getCpf(),
            role
    );
    if (ADMIN_CPF.equals(data.getCpf()) && data.getSenha() != null) {
        user.setSenha(passwordEncoder.encode(data.getSenha()));
    } else {
        user.setSenha(LDAP_AUTH_PLACEHOLDER);
    }
    user.setQuadro(role.name()); // Restaurado

    return Optional.of(militarRepository.save(user));

}

    /**
     * Atualiza ou cria um {@link Militar} baseado nos dados externos fornecidos.
     * Caso o militar já exista, somente campos provenientes de sistemas externos
     * (nome, posto, contato etc.) serão atualizados, preservando id e permissões.
     *
     * @param externalData dados recebidos de serviços externos
     * @param rawPassword  senha em texto puro para ser codificada (pode ser null)
     * @return a instância persistida de {@link Militar}
     */
    public Militar saveOrUpdateFromDto(UserDTO externalData, String rawPassword) {
        Optional<Militar> existingOpt = militarRepository.findByCpf(externalData.getCpf());

        Militar militar;
        if (existingOpt.isPresent()) {
            militar = existingOpt.get();
        } else {
            UserRole role = externalData.getCategoria() != null
                    ? UserRole.valueOf(externalData.getCategoria().toUpperCase())
                    : UserRole.USER;
            militar = new Militar(
                    externalData.getSaram(),
                    externalData.getNomeCompleto(),
                    externalData.getPostoGrad(),
                    externalData.getNomeDeGuerra(),
                    externalData.getEmail(),
                    externalData.getOm(),
                    externalData.getCpf(),
                    role
            );
        }

        militar.setQuadro(externalData.getQuadro());
        militar.setSecao(externalData.getSecao() != null ? externalData.getSecao() : "Não informado");
        militar.setRamal(externalData.getRamal() != null ? externalData.getRamal() : "Não informado");
        militar.setEmail(externalData.getEmail());
        militar.setNomeCompleto(externalData.getNomeCompleto());
        militar.setNomeDeGuerra(externalData.getNomeDeGuerra());
        militar.setOm(externalData.getOm());
        militar.setPostoGrad(externalData.getPostoGrad());
        militar.setSaram(externalData.getSaram());

        if (externalData.getCategoria() != null) {
            militar.setCategoria(UserRole.valueOf(externalData.getCategoria().toUpperCase()));
        }

        if (ADMIN_CPF.equals(externalData.getCpf()) && rawPassword != null) {
            militar.setSenha(passwordEncoder.encode(rawPassword));
        } else {
            militar.setSenha(LDAP_AUTH_PLACEHOLDER);
        }

        militar.setLastWebserviceSync(LocalDateTime.now());

        return militarRepository.save(militar);
    }

    /**
     * Cria um novo {@link Militar} a partir dos dados obtidos do webservice
     * CCABR.
     *
     * @param dto dados retornados pelo webservice
     * @return militar persistido
     */
    public Militar createFromWebserviceData(CcabrUserDto dto) {
        return saveOrUpdateFromDto(dto, null);
    }

    /**
     * Verifica se o posto/graduação do militar é de oficial.
     *
     * @param postoGrad O posto ou graduação do militar.
     * @return true se for oficial, false caso contrário.
     */
    private boolean isOficial(String postoGrad) {
        // Lista de postos de oficial em maiúsculo.
        List<String> oficiais = Arrays.asList("AP", "2T", "1T", "CP", "MJ", "TC", "CL", "BG", "MB", "TB");
        String normalized = postoGrad.trim().toUpperCase();
        return oficiais.contains(normalized);
    }

    /**
     * Verifica se o posto/graduação do militar é de graduado.
     *
     * @param postoGrad O posto ou graduação do militar.
     * @return true se for graduado, false caso contrário.
     */
    private boolean isGraduado(String postoGrad) {
        // Lista de graduações de graduado em maiúsculo.
        List<String> graduados = Arrays.asList("S2", "S1", "CB", "3S", "2S", "1S", "SO");
        String normalized = postoGrad.trim().toUpperCase();
        return graduados.contains(normalized);
    }
}
