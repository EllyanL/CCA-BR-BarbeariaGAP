package intraer.ccabr.barbearia_api.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JustificativaAusenciaRequest(
        @NotBlank
        @Size(max = 250)
        String justificativa
) {}
