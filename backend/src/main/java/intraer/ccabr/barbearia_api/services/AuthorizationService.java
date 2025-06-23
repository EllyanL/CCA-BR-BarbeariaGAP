package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AuthorizationService implements UserDetailsService {
    private final MilitarRepository militarRepository;

    public AuthorizationService(MilitarRepository militarRepository) {
        this.militarRepository = militarRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String cpf) throws UsernameNotFoundException {
        return militarRepository.findByCpf(cpf)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário com CPF " + cpf + " não encontrado."));
    }

}
