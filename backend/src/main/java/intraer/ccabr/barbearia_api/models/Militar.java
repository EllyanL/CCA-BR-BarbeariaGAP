package intraer.ccabr.barbearia_api.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import intraer.ccabr.barbearia_api.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Entidade que representa um militar no sistema, mapeada para a tabela 'militares'.
 * Implementa UserDetails para integração com Spring Security.
 */

@Table(name = "militares")
@Entity(name = "Militar")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@EqualsAndHashCode(of = "id")
public class Militar implements UserDetails {

    /** Valor padrão armazenado para indicar autenticação via LDAP. */
    public static final String LDAP_AUTH_PLACEHOLDER = "Autenticado no LDAP";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty
    private Long id;

    @Column(name = "saram", length = 15)
    @JsonProperty
    private String saram;

    @Column(name = "nome_completo", length = 100)
    @JsonProperty
    private String nomeCompleto;

    @Column(name = "posto_grad", length = 10)
    @JsonProperty
    private String postoGrad;

    @Column(name = "nome_de_guerra", length = 20)
    @JsonProperty
    private String nomeDeGuerra;

    @Column(name = "email", length = 50)
    @JsonProperty
    private String email;

    @Column(name = "om", length = 15)
    @JsonProperty
    private String om;

    @Column(name = "secao", length = 20)
    @JsonProperty
    private String secao;

    @Column(name = "ramal", length = 15)
    @JsonProperty
    private String ramal;

    @Column(name = "cpf", length = 15, unique = true)
    @JsonProperty
    private String cpf;

    @Column(name = "senha", length = 255, nullable = true,
            columnDefinition = "varchar(255) default 'Autenticado no LDAP'")
    @JsonProperty
    private String senha;

    @Column(name = "last_webservice_sync")
    @JsonProperty
    private LocalDateTime lastWebserviceSync;

    @Column(name = "quadro", length = 15)
    @JsonProperty
    private String quadro;

    @Column(name = "u_agendamento")
    @JsonProperty
    private LocalDate ultimoAgendamento;

    @Enumerated(EnumType.STRING)
    @Column(name = "categoria", length = 10)
    @JsonProperty
    private UserRole categoria;

    public Militar(String saram, String nomeCompleto, String postoGrad, String nomeDeGuerra, String email, String om, String cpf, UserRole categoria) {
        this.saram = saram;
        this.nomeCompleto = nomeCompleto;
        this.postoGrad = postoGrad;
        this.nomeDeGuerra = nomeDeGuerra;
        this.email = email;
        this.om = om;
        this.cpf = cpf;
        this.categoria = categoria;
    }

    @Override
    @JsonProperty
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (this.categoria == UserRole.ADMIN) {
            return List.of(
                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                    new SimpleGrantedAuthority("ROLE_OFICIAL"),
                    new SimpleGrantedAuthority("ROLE_GRADUADO"),
                    new SimpleGrantedAuthority("ROLE_USER")
            );
        } else if (this.categoria == UserRole.GRADUADO) {
            return List.of(new SimpleGrantedAuthority("ROLE_GRADUADO"));
        } else if (this.categoria == UserRole.OFICIAL) {
            return List.of(new SimpleGrantedAuthority("ROLE_OFICIAL"));
        } else {
            return List.of(new SimpleGrantedAuthority("ROLE_USER"));
        }
    }

    @Override
    @JsonProperty
    public String getUsername() {
        return cpf;
    }

    @Override
    @JsonProperty
    public String getPassword() {
        return senha;
    }

    @Override
    @JsonProperty
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    @JsonProperty
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    @JsonProperty
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    @JsonProperty
    public boolean isEnabled() {
        return true;
    }
}
