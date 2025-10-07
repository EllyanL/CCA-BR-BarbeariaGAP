package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.dtos.JustificativaAusenciaAdminDTO;
import intraer.ccabr.barbearia_api.dtos.JustificativaAusenciaDTO;
import intraer.ccabr.barbearia_api.dtos.JustificativaAusenciaRequest;
import intraer.ccabr.barbearia_api.models.JustificativaAusencia;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.services.JustificativaAusenciaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/justificativas-ausencia")
public class JustificativaAusenciaController {

    private final JustificativaAusenciaService justificativaAusenciaService;

    public JustificativaAusenciaController(JustificativaAusenciaService justificativaAusenciaService) {
        this.justificativaAusenciaService = justificativaAusenciaService;
    }

    @PostMapping("/agendamentos/{agendamentoId}")
    @PreAuthorize("hasAnyRole('GRADUADO','OFICIAL','ADMIN')")
    public ResponseEntity<JustificativaAusenciaDTO> solicitarJustificativa(
            @PathVariable Long agendamentoId,
            @Valid @RequestBody JustificativaAusenciaRequest request,
            Authentication authentication
    ) {
        Militar solicitante = (Militar) authentication.getPrincipal();
        JustificativaAusencia justificativa = justificativaAusenciaService
                .solicitarJustificativa(solicitante, agendamentoId, request.justificativa());
        return ResponseEntity.status(HttpStatus.CREATED).body(new JustificativaAusenciaDTO(justificativa));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<JustificativaAusenciaAdminDTO>> listarSolicitacoes() {
        List<JustificativaAusencia> justificativas = justificativaAusenciaService.listarTodas();
        if (justificativas.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        List<JustificativaAusenciaAdminDTO> dtos = justificativas.stream()
                .map(JustificativaAusenciaAdminDTO::new)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<JustificativaAusenciaAdminDTO> detalhar(@PathVariable Long id) {
        JustificativaAusencia justificativa = justificativaAusenciaService.detalhar(id);
        return ResponseEntity.ok(new JustificativaAusenciaAdminDTO(justificativa));
    }

    @PostMapping("/admin/{id}/aprovar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<JustificativaAusenciaAdminDTO> aprovar(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Militar admin = (Militar) authentication.getPrincipal();
        JustificativaAusencia justificativa = justificativaAusenciaService.aprovar(id, admin);
        return ResponseEntity.ok(new JustificativaAusenciaAdminDTO(justificativa));
    }

    @PostMapping("/admin/{id}/recusar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<JustificativaAusenciaAdminDTO> recusar(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Militar admin = (Militar) authentication.getPrincipal();
        JustificativaAusencia justificativa = justificativaAusenciaService.recusar(id, admin);
        return ResponseEntity.ok(new JustificativaAusenciaAdminDTO(justificativa));
    }
}
