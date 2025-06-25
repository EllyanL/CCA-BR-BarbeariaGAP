package intraer.ccabr.barbearia_api.controllers;

import intraer.ccabr.barbearia_api.dtos.HorarioDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Horario;

import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.services.HorarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/horarios")
public class HorarioController {
    private final HorarioService horarioService;
    private final HorarioRepository horarioRepository;
    private static final Logger logger = LoggerFactory.getLogger(HorarioController.class);

    public HorarioController(HorarioService horarioService, HorarioRepository horarioRepository) {
        this.horarioService = horarioService;
        this.horarioRepository = horarioRepository;
    }
    @GetMapping
    public Map<String, Map<String, List<Horario>>> getTodosHorarios() {
        return horarioService.getTodosHorarios();
    }
    @GetMapping("/base")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getHorariosBase() {
        return ResponseEntity.ok(horarioService.getHorariosUnicos());
    }
    @PostMapping("/adicionar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adicionarHorarioPersonalizado(@RequestBody Map<String, String> request) {
        String horario = request.get("horario");
        String dia = request.get("dia");
        String categoria = request.get("categoria");

        if (horario == null || dia == null || categoria == null ||
            horario.isBlank() || dia.isBlank() || categoria.isBlank()) {
            return ResponseEntity.badRequest().body("Campos obrigatórios: horario, dia, categoria.");
        }

        Optional<Horario> existente = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        if (existente.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Horário já existente.");
        }

        Horario novo = new Horario(dia, horario, categoria, HorarioStatus.DISPONIVEL);
        horarioRepository.save(novo);
        return ResponseEntity.ok(new HorarioDTO(novo));
    }
    @DeleteMapping("/remover")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removerHorarioPersonalizado(@RequestBody Map<String, String> request) {
        String horario = request.get("horario");
        String dia = request.get("dia");
        String categoria = request.get("categoria");

        Optional<Horario> existente = horarioRepository.findByDiaAndHorarioAndCategoria(dia, horario, categoria);
        if (existente.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Horário não encontrado.");
        }

        horarioRepository.delete(existente.get()); // <-- REMOVE DO BANCO
        return ResponseEntity.ok("Horário removido com sucesso.");
    }
    @GetMapping("/{dia}")
    public List<Horario> getHorariosPorDiaECategoria(@PathVariable String dia, @RequestParam String categoria) {
        return horarioService.getHorariosPorDiaECategoria(dia, categoria);
    }
    @PostMapping
    public Horario salvarHorario(@RequestBody Horario horario) {
        return horarioService.salvarHorario(horario);
    }
    @PostMapping("/indisponibilizar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> indisponibilizarHorario(@RequestBody @Valid HorarioDTO horarioDTO) {
        try {
            if (horarioDTO.getDia() == null || horarioDTO.getDia().trim().isEmpty() ||
                horarioDTO.getHorario() == null || horarioDTO.getHorario().trim().isEmpty() ||
                horarioDTO.getCategoria() == null || horarioDTO.getCategoria().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("mensagem", "Dia, horário e categoria são obrigatórios."));
            }
            Horario horarioIndisponibilizado = horarioService.indisponibilizarHorario(
                    horarioDTO.getDia(), horarioDTO.getHorario(), horarioDTO.getCategoria());
            Map<String, Object> response = new HashMap<>();
            if (horarioIndisponibilizado != null) {
                response.put("mensagem", "Horário indisponibilizado com sucesso para " + horarioDTO.getCategoria());
                response.put("horario", horarioIndisponibilizado);
            } else {
                response.put("mensagem", "Nenhum horário encontrado para indisponibilizar.");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Dados inválidos para indisponibilizar horário."));
        } catch (Exception e) {
            logger.error("Erro ao indisponibilizar horário", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("mensagem", "Erro interno no servidor, tente novamente"));
        }
    }
    @PostMapping("/disponibilizar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> disponibilizarHorario(@RequestBody @Valid HorarioDTO horarioDTO) {
        try {
            if (horarioDTO.getDia() == null || horarioDTO.getDia().trim().isEmpty() ||
                horarioDTO.getHorario() == null || horarioDTO.getHorario().trim().isEmpty() ||
                horarioDTO.getCategoria() == null || horarioDTO.getCategoria().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("mensagem", "Dia, horário e categoria são obrigatórios."));
            }
            Horario horarioDisponibilizado = horarioService.disponibilizarHorario(
                    horarioDTO.getDia(), horarioDTO.getHorario(), horarioDTO.getCategoria());
            Map<String, Object> response = new HashMap<>();
            response.put("mensagem", "Horário disponibilizado com sucesso para " + horarioDTO.getCategoria());
            response.put("horario", horarioDisponibilizado);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Dados inválidos para disponibilizar horário."));
        } catch (Exception e) {
            logger.error("Erro ao disponibilizar horário", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("mensagem", "Erro interno no servidor, tente novamente"));
        }
    }
    @PostMapping("/indisponibilizar/tudo/{dia}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> indisponibilizarTodosHorarios(@PathVariable String dia, @RequestBody List<String> horarios, @RequestParam String categoria) {
        try {
            Map<String, Object> response = horarioService.indisponibilizarTodosHorarios(dia, horarios, categoria);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Dados inválidos para indisponibilizar horários."));
        } catch (Exception e) {
            logger.error("Erro ao indisponibilizar horários", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("mensagem", "Erro interno no servidor, tente novamente"));
        }
    }
    @PostMapping("/disponibilizar/tudo/{dia}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> disponibilizarTodosHorarios(@PathVariable String dia, @RequestBody List<String> horarios, @RequestParam String categoria) {
        try {
            Map<String, Object> response = horarioService.disponibilizarTodosHorarios(dia, horarios, categoria);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Dados inválidos para disponibilizar horários."));
        } catch (Exception e) {
            logger.error("Erro ao disponibilizar horários", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("mensagem", "Erro interno no servidor, tente novamente"));
        }
    }
    @GetMapping("/categoria/{categoria}")
    public ResponseEntity<Map<String, List<HorarioDTO>>> listarPorCategoria(@PathVariable String categoria) {
        return ResponseEntity.ok(horarioService.listarHorariosAgrupadosPorCategoria(categoria));
    }

    @PutMapping("/status")
    public ResponseEntity<HorarioDTO> alterarStatus(@RequestParam String dia,
                                                    @RequestParam String horario,
                                                    @RequestParam String categoria,
                                                    @RequestParam HorarioStatus status) {
        return ResponseEntity.ok(horarioService.alterarStatus(dia, horario, categoria, status));
    }
}