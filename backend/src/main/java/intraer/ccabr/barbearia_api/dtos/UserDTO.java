package intraer.ccabr.barbearia_api.dtos;

import lombok.*;

/**
 * DTO que representa os dados de um usuário retornados por serviços externos (LDAP ou webservice).
 * Utilizado para mapear informações de um militar para uso no sistema.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class UserDTO {

    private String saram; // Número SARAM do militar
    private String nomeCompleto; // Nome completo do militar
    private String postoGrad; // Posto ou graduação do militar
    private String nomeDeGuerra; // Nome de guerra do militar
    private String email; // Email do militar
    private String om; // Organização militar (OM)
    private String cpf; // CPF do militar
    private String categoria; // Restaurado
    private String secao; // Seção do militar (ex.: SAI)
    private String ramal; // Ramal telefônico do militar
    private String role; // Papel do militar (ex.: USER, GRADUADO)

    /**
     * Construtor com os campos básicos de um usuário, utilizado para mapear dados do LDAP ou banco local.
     *
     * @param saram O número SARAM do militar.
     * @param nomeCompleto O nome completo do militar.
     * @param postoGrad O posto ou graduação do militar.
     * @param nomeDeGuerra O nome de guerra do militar.
     * @param email O email do militar.
     * @param om A organização militar (OM).
     * @param cpf O CPF do militar.     
     */
    public UserDTO(String saram, String nomeCompleto, String postoGrad, String nomeDeGuerra, String email, String om, String cpf) {
        this.saram = saram;
        this.nomeCompleto = nomeCompleto;
        this.postoGrad = postoGrad;
        this.nomeDeGuerra = nomeDeGuerra;
        this.email = email;
        this.om = om;
        this.cpf = cpf;
    }
}
