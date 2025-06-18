package intraer.ccabr.barbearia_api.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EmailRequestDTO {
    private String para;
    private String assunto;
    private String conteudoHtml;
}