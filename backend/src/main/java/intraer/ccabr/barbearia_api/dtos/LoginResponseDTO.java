package intraer.ccabr.barbearia_api.dtos;

import lombok.Getter;
import lombok.Setter;

/**
 * DTO que representa a resposta de login, contendo o token JWT e informações do usuário.
 */
@Getter
@Setter
public class LoginResponseDTO {
    private Long id;
    private String token;
    private String role;
    private String postoGrad;
    private String om;
    private String nomeDeGuerra;
    private String saram;     
    private String nomeCompleto; 
    private String email;      
    private String secao;      
    private String ramal;      

    /**
     * Construtor padrão.
     */
    public LoginResponseDTO() {}

    /**
     * Construtor que inicializa o token.
     *
     * @param token O token gerado para o usuário.
     */
    public LoginResponseDTO(String token) {
        this.token = token;
    }

    /**
     * Construtor que inicializa o token e as informações do usuário.
     *
     * @param token O token gerado para o usuário.
     * @param role O papel do usuário (ex.: USER, OFICIAL, GRADUADO, ADMIN).
     * @param postoGrad O posto/graduação do militar.
     * @param om A organização militar do usuário.
     */
    public LoginResponseDTO(String token, String role, String postoGrad, String om) {
        this.token = token;
        this.role = role;
        this.postoGrad = postoGrad;
        this.om = om;
    }

    /**
     * Construtor que inicializa o token e todas as informações do usuário, incluindo nomeDeGuerra.
     *
     * @param token O token gerado para o usuário.
     * @param role O papel do usuário (ex.: USER, OFICIAL, GRADUADO, ADMIN).
     * @param postoGrad O posto/graduação do militar.
     * @param om A organização militar do usuário.
     * @param nomeDeGuerra O nome de guerra do usuário.
     */
    public LoginResponseDTO(String token, String role, String postoGrad, String om, String nomeDeGuerra) {
        this.token = token;
        this.role = role;
        this.postoGrad = postoGrad;
        this.om = om;
        this.nomeDeGuerra = nomeDeGuerra;
    }

    /**
     * Construtor que inicializa todas as informações do usuário, incluindo campos adicionais.
     *
     * @param token O token gerado para o usuário.
     * @param role O papel do usuário (ex.: USER, OFICIAL, GRADUADO, ADMIN).
     * @param postoGrad O posto/graduação do militar.
     * @param om A organização militar do usuário.
     * @param nomeDeGuerra O nome de guerra do usuário.
     * @param saram O SARAM do militar.
     * @param nomeCompleto O nome completo do militar.
     * @param email O email do militar.
     * @param secao A seção do militar.
     * @param ramal O ramal do militar.
     */
    public LoginResponseDTO(Long id, String token, String role, String postoGrad, String om, String nomeDeGuerra,
                            String saram, String nomeCompleto, String email, String secao, String ramal) {
        this.id = id;
        this.token = token;
        this.role = role;
        this.postoGrad = postoGrad;
        this.om = om;
        this.nomeDeGuerra = nomeDeGuerra;
        this.saram = saram;
        this.nomeCompleto = nomeCompleto;
        this.email = email;
        this.secao = secao;
        this.ramal = ramal;
    }
}
