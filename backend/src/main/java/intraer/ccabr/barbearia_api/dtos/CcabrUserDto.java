package intraer.ccabr.barbearia_api.dtos;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO específico para dados de usuário retornados pelo webservice CCABR.
 * Estende {@link UserDTO} para reaproveitar os mesmos campos.
 */
@Getter
@Setter
@NoArgsConstructor
public class CcabrUserDto extends UserDTO {
    // Classe intencionalmente vazia. Serve apenas para tipar respostas do webservice.
}
