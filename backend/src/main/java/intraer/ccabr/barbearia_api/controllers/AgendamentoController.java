package intraer.ccabr.barbearia_api.controllers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import intraer.ccabr.barbearia_api.dtos.AgendamentoDTO;
import intraer.ccabr.barbearia_api.dtos.AgendamentoUpdateDTO;
import intraer.ccabr.barbearia_api.dtos.AgendamentoAdminDTO;
import intraer.ccabr.barbearia_api.dtos.AgendamentoCreateDTO;
import intraer.ccabr.barbearia_api.enums.HorarioStatus;
import intraer.ccabr.barbearia_api.models.Agendamento;
import intraer.ccabr.barbearia_api.models.Horario;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.AgendamentoRepository;
import intraer.ccabr.barbearia_api.repositories.HorarioRepository;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import org.springframework.security.core.Authentication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import intraer.ccabr.barbearia_api.services.AgendamentoService;
import intraer.ccabr.barbearia_api.services.HorarioUpdateService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/agendamentos")
@PreAuthorize("isAuthenticated()")
public class AgendamentoController {

    private static final Logger logger = LoggerFactory.getLogger(AgendamentoController.class);

    private final AgendamentoService agendamentoService;

    private final AgendamentoRepository agendamentoRepository;

    private final MilitarRepository militarRepository;

    private final HorarioRepository horarioRepository;

    private final HorarioUpdateService horarioUpdateService;


    public AgendamentoController(
        AgendamentoService agendamentoService,
        AgendamentoRepository agendamentoRepository,
        MilitarRepository militarRepository,
        HorarioRepository horarioRepository,
        HorarioUpdateService horarioUpdateService
    ) {
        this.agendamentoService = agendamentoService;
        this.agendamentoRepository = agendamentoRepository;
        this.militarRepository = militarRepository;
        this.horarioRepository = horarioRepository;
        this.horarioUpdateService = horarioUpdateService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GRADUADO', 'OFICIAL')")
    public ResponseEntity<Object> createAgendamento(@RequestBody @Valid AgendamentoCreateDTO dto, Authentication authentication) {
        String userCpf = authentication.getName();

        logger.debug("🔐 CPF do token recebido: {}", userCpf);
        Optional<Militar> userOpt = militarRepository.findByCpf(userCpf);
        if (userOpt.isEmpty()) {
            logger.warn("⚠️ Militar não encontrado para o CPF {}", userCpf);
            return buildResponse("Usuário autenticado não encontrado no banco.", HttpStatus.FORBIDDEN);
        }

        logger.debug("✅ Militar encontrado com ID {}", userOpt.get().getId());

        Militar militar = userOpt.get();

        Agendamento agendamento = new Agendamento();
        agendamento.setData(dto.getData());
        agendamento.setHora(dto.getHora());
        agendamento.setDiaSemana(dto.getDiaSemana());
        agendamento.setCategoria(dto.getCategoria());

        // Busca horário para validação
        Optional<Horario> horarioOpt = horarioRepository.findByDiaAndHorarioAndCategoria(
            agendamento.getDiaSemana(), agendamento.getHora(), agendamento.getCategoria()
        );

        if (horarioOpt.isEmpty()) {
            return buildResponse("O horário selecionado não está disponível para a categoria informada.", HttpStatus.CONFLICT);
        }

        Horario horario = horarioOpt.get();
        if (horario.getStatus() != HorarioStatus.DISPONIVEL) {
        return buildResponse("O horário selecionado já está ocupado ou indisponível.", HttpStatus.CONFLICT);
        }


        // Evita duplo envio (chave única: data/hora/categoria)
        boolean jaExiste = agendamentoRepository.existsByDataAndHoraAndDiaSemanaAndCategoriaAndStatusNot(
            agendamento.getData(),
            agendamento.getHora(),
            agendamento.getDiaSemana(),
            agendamento.getCategoria(),
            "CANCELADO"
        );
        if (jaExiste) {
            return buildResponse("Já existe um agendamento para esse horário.", HttpStatus.CONFLICT);
        }

        agendamento.setMilitar(militar);
        agendamentoService.validarRegrasDeNegocio(agendamento);
        try {
            Agendamento saved = agendamentoService.criarAgendamentoTransactional(agendamento);
            horarioUpdateService.sendUpdate("refresh");
            return new ResponseEntity<>(new AgendamentoDTO(saved), HttpStatus.CREATED);
        } catch (DataIntegrityViolationException e) {
            return buildResponse("Horário indisponível", HttpStatus.CONFLICT);
        }
    }

    @GetMapping
    public ResponseEntity<List<AgendamentoDTO>> findAll(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userCpf = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

        List<Agendamento> agendamentos;
        if (isAdmin) {
            agendamentos = agendamentoService.findAll();
        } else {
            String categoriaUsuario = determineCategoriaUsuario(authentication);
            if (categoriaUsuario == null) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
            agendamentos = agendamentoRepository.findByMilitarCpfAndCategoriaAndDataAfter(
                    userCpf,
                    categoriaUsuario,
                    LocalDate.now());
        }

    if (agendamentos.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    List<AgendamentoDTO> agendamentoDTOs = agendamentos.stream()
            .map(AgendamentoDTO::new)
            .toList();

        return new ResponseEntity<>(agendamentoDTOs, HttpStatus.OK);
    }

    @GetMapping("/meus")
    @PreAuthorize("hasAnyRole('GRADUADO','OFICIAL','ADMIN')")
    public ResponseEntity<List<AgendamentoDTO>> findByMilitar(Authentication authentication) {
        String userCpf = authentication.getName();
        Optional<Militar> militarOpt = militarRepository.findByCpf(userCpf);
        if (militarOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Agendamento> agendamentos = agendamentoService.findByMilitarId(militarOpt.get().getId());
        if (agendamentos.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }

        List<AgendamentoDTO> dtos = agendamentos.stream()
                .map(AgendamentoDTO::new)
                .toList();

        return new ResponseEntity<>(dtos, HttpStatus.OK);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> findForAdmin(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dataFim
    ) {
        List<Agendamento> agendamentos = agendamentoService.findByCategoriaAndPeriodo(categoria, dataInicio, dataFim);
        if (agendamentos.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }

        List<AgendamentoAdminDTO> dtos = agendamentos.stream()
                .map(AgendamentoAdminDTO::new)
                .toList();

        return new ResponseEntity<>(dtos, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GRADUADO', 'OFICIAL')")
    public ResponseEntity<Agendamento> findById(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        Optional<Agendamento> agendamento = agendamentoService.findById(id);
        if (agendamento.isPresent()) {
            Agendamento ag = agendamento.get();
            String userCpf = authentication.getName();
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

            if (isAdmin || ag.getMilitar().getCpf().equals(userCpf)) {
                String categoriaUsuario = determineCategoriaUsuario(authentication);
                if (!isAdmin && categoriaUsuario != null && !ag.getCategoria().equals(categoriaUsuario)) {
                    return new ResponseEntity<>(HttpStatus.FORBIDDEN);
                }
                return new ResponseEntity<>(ag, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GRADUADO', 'OFICIAL')")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody AgendamentoUpdateDTO dto,
                                    org.springframework.security.core.Authentication authentication) {
        Optional<Agendamento> agOpt = agendamentoService.findById(id);
        if (agOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Agendamento não encontrado.");
        }

        Agendamento agendamento = agOpt.get();
        String userCpf = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && !agendamento.getMilitar().getCpf().equals(userCpf)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Você só pode editar seus próprios agendamentos.");
        }

        String categoriaUsuario = determineCategoriaUsuario(authentication);
        if (!isAdmin && categoriaUsuario != null && !agendamento.getCategoria().equals(categoriaUsuario)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Você só pode editar agendamentos da sua própria categoria.");
        }

        Optional<Agendamento> atualizado = agendamentoService.atualizarAgendamento(id, dto.getData(), dto.getHora(), dto.getDiaSemana());
        if (atualizado.isPresent()) {
            horarioUpdateService.sendUpdate("refresh");
            return ResponseEntity.ok(new AgendamentoDTO(atualizado.get()));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Agendamento não encontrado.");
    }

    @PutMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('ADMIN', 'GRADUADO', 'OFICIAL')")
    public ResponseEntity<String> cancelar(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        Optional<Agendamento> agendamentoOpt = agendamentoService.findById(id);

        if (agendamentoOpt.isPresent()) {
            Agendamento agendamento = agendamentoOpt.get();
            String userCpf = authentication.getName();
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

            Militar usuarioLogado = militarRepository.findByCpf(userCpf).orElse(null);

            if (!isAdmin && (usuarioLogado == null ||
                    !agendamento.getMilitar().getId().equals(usuarioLogado.getId()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Você só pode desmarcar seus próprios agendamentos.");
            }

            String categoriaUsuario = determineCategoriaUsuario(authentication);
            if (!isAdmin && categoriaUsuario != null && !agendamento.getCategoria().equals(categoriaUsuario)) {
                logger.debug("🛑 Categoria do agendamento: {}", agendamento.getCategoria());
                logger.debug("✅ Categoria do usuário: {}", categoriaUsuario);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Você só pode desmarcar agendamentos da sua própria categoria.");
            }

            if (agendamentoService.isAgendamentoPassado(agendamento)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Não é possível desmarcar um agendamento que já ocorreu.");
            }

            final String canceladoPor = isAdmin ? "ADMIN" : "USUARIO";
            agendamentoService.cancelarAgendamento(id, canceladoPor);
            horarioUpdateService.sendUpdate("refresh");
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Agendamento não encontrado.");
    }

    @PostMapping("/check-em-lote")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> checkEmLote(
            @RequestParam("data") String data,
            @RequestParam("categoria") String categoria,
            @RequestBody List<Map<String, Object>> horariosPorDia) {
        try {
            LocalDate parsedData = LocalDate.parse(data);
            Map<String, Map<String, Agendamento>> resultado = agendamentoService.verificarAgendamentosEmLote(parsedData, categoria, horariosPorDia);
            return ResponseEntity.ok(resultado);
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/check")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AgendamentoDTO> checkAgendamento(
            @RequestParam("data") String data,
            @RequestParam("hora") String hora,
            @RequestParam("dia") String dia,
            @RequestParam("categoria") String categoria) {
        try {
            LocalDate parsedData = LocalDate.parse(data);
            LocalTime parsedHora = LocalTime.parse(hora);
            return agendamentoService
                    .findAgendamentoByDataHoraDiaCategoria(parsedData, parsedHora, dia, categoria)
                    .map(a -> new ResponseEntity<>(new AgendamentoDTO(a), HttpStatus.OK))
                    .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
        } catch (DateTimeParseException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }


    private String determineCategoriaUsuario(org.springframework.security.core.Authentication authentication) {
        boolean isGraduado = authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_GRADUADO"));
        boolean isOficial = authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_OFICIAL"));

        if (isGraduado) {
            return "GRADUADO";
        } else if (isOficial) {
            return "OFICIAL";
        }
        return null;
    }

    private ResponseEntity<Object> buildResponse(Object body, HttpStatus status) {
        return new ResponseEntity<>(body, status);
    }
}
