package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.dtos.UserDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthenticationServiceTest {

    private MilitarRepository militarRepository;
    private TokenService tokenService;
    private PasswordEncoder passwordEncoder;
    private AuthenticationManager authenticationManager;
    private AuthenticationService service;

    @BeforeEach
    void setup() {
        militarRepository = mock(MilitarRepository.class);
        tokenService = mock(TokenService.class);
        passwordEncoder = mock(PasswordEncoder.class);
        authenticationManager = mock(AuthenticationManager.class);
        service = new AuthenticationService(militarRepository, tokenService, passwordEncoder, authenticationManager);
    }

    @Test
    void shouldDetermineRoleWhenCategoriaMissing() {
        UserDTO dto = new UserDTO();
        dto.setCpf("123");
        dto.setSaram("1");
        dto.setNomeCompleto("Nome");
        dto.setPostoGrad("1T");
        dto.setNomeDeGuerra("NG");
        dto.setEmail("e");
        dto.setOm("OM");

        when(militarRepository.findByCpf("123")).thenReturn(Optional.empty());
        when(militarRepository.saveAndFlush(any(Militar.class))).thenAnswer(inv -> inv.getArgument(0));

        Militar saved = service.saveOrUpdateFromDto(dto);

        assertEquals(UserRole.OFICIAL, saved.getCategoria());
    }
}
