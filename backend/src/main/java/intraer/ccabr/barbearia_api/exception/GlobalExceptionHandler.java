package intraer.ccabr.barbearia_api.exception;

import intraer.ccabr.barbearia_api.dtos.ErrorResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return new ResponseEntity<>(new ErrorResponse("ILLEGAL_ARGUMENT", ex.getMessage()), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        return new ResponseEntity<>(new ErrorResponse("DATA_INTEGRITY_VIOLATION", "Violação de integridade de dados."), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        String code = ex.getReason();
        String message = resolveMessage(code);
        return new ResponseEntity<>(new ErrorResponse(code, message), ex.getStatusCode());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        return new ResponseEntity<>(new ErrorResponse("INTERNAL_ERROR", "Erro interno no servidor, tente novamente"),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private String resolveMessage(String code) {
        return switch (code) {
            case "FORA_DA_JANELA_PERMITIDA" -> "Agendamentos são permitidos entre (Início + 10 min) e (Fim − 30 min).";
            case "JANELA_CONFLITO_AGENDAMENTOS" -> "Não é possível realizar alteração com agendamentos ativos.";
            default -> code;
        };
    }
}