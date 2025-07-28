package intraer.ccabr.barbearia_api.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import intraer.ccabr.barbearia_api.dtos.UserDTO;
import intraer.ccabr.barbearia_api.enums.UserRole;
import intraer.ccabr.barbearia_api.infra.security.TokenService;
import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;

class AuthenticationServiceSaveOrUpdateTests {
    private AuthenticationService service;
    private MilitarRepository repository;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setup() {
        repository = mock(MilitarRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        service = new AuthenticationService(
            repository,
            mock(TokenService.class),
            passwordEncoder,
            mock(AuthenticationManager.class)
        );
    }

    @Test
    void createsNewMilitarWhenNotExists() {
        when(repository.findByCpf("123")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("pass")).thenReturn("enc");

        Militar saved = new Militar();
        saved.setCpf("123");
        saved.setRole(UserRole.USER);
        when(repository.save(any(Militar.class))).thenReturn(saved);

        UserDTO dto = new UserDTO();
        dto.setCpf("123");
        dto.setSaram("1");
        dto.setNomeCompleto("Nome");
        dto.setPostoGrad("SGT");
        dto.setNomeDeGuerra("G");
        dto.setEmail("e");
        dto.setOm("OM");
        dto.setRole("USER");
        dto.setCategoria("CAT");
        dto.setSecao("SEC");
        dto.setRamal("RAM");

        Militar result = service.saveOrUpdateFromDto(dto, "pass");

        assertSame(saved, result);
        ArgumentCaptor<Militar> captor = ArgumentCaptor.forClass(Militar.class);
        verify(repository).save(captor.capture());
        Militar toSave = captor.getValue();
        assertEquals("enc", toSave.getSenha());
        assertEquals(UserRole.USER, toSave.getRole());
        assertEquals("SEC", toSave.getSecao());
    }

    @Test
    void updatesExistingMilitarWithoutOverwritingRole() {
        Militar existing = new Militar();
        existing.setId(1L);
        existing.setCpf("123");
        existing.setRole(UserRole.GRADUADO);
        existing.setNomeCompleto("Old");
        existing.setSenha("old");

        when(repository.findByCpf("123")).thenReturn(Optional.of(existing));
        when(passwordEncoder.encode("p")).thenReturn("enc");
        when(repository.save(existing)).thenReturn(existing);

        UserDTO dto = new UserDTO();
        dto.setCpf("123");
        dto.setNomeCompleto("Novo");
        dto.setSecao("Sec");

        Militar result = service.saveOrUpdateFromDto(dto, "p");

        assertSame(existing, result);
        assertEquals("Novo", existing.getNomeCompleto());
        assertEquals(UserRole.GRADUADO, existing.getRole());
        assertEquals("enc", existing.getSenha());
    }
}
