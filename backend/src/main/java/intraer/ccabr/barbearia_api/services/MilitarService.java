package intraer.ccabr.barbearia_api.services;

import intraer.ccabr.barbearia_api.models.Militar;
import intraer.ccabr.barbearia_api.repositories.MilitarRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MilitarService {

    private final MilitarRepository militarRepository;

    public MilitarService(MilitarRepository militarRepository) {
        this.militarRepository = militarRepository;
    }

    @Transactional
    public Militar save(Militar militar) {
        return militarRepository.save(militar);
    }

    public List<Militar> findAll() {
        return militarRepository.findAll();
    }

    public Optional<Militar> findById(Long id) {
        return militarRepository.findById(id);
    }

    @Transactional
    public void deleteById(Long id) {
        militarRepository.deleteById(id);
    }

    public List<Militar> findByCategoria(String categoria) {
        return militarRepository.findByCategoria(categoria);
    }

    public Militar verifyAndUpdateMilitar(Militar militar) {
        Optional<Militar> existingMilitarOptional = militarRepository.findBySaram(militar.getSaram());

        if (existingMilitarOptional.isPresent()) {
            Militar existingMilitar = existingMilitarOptional.get();

            // Atualiza todos os campos relevantes
            existingMilitar.setNomeCompleto(militar.getNomeCompleto());
            existingMilitar.setPostoGrad(militar.getPostoGrad());
            existingMilitar.setNomeDeGuerra(militar.getNomeDeGuerra());
            existingMilitar.setEmail(militar.getEmail());
            existingMilitar.setOm(militar.getOm());
            existingMilitar.setSecao(militar.getSecao());
            existingMilitar.setRamal(militar.getRamal());
            existingMilitar.setCategoria(militar.getCategoria());
            existingMilitar.setCpf(militar.getCpf());
            existingMilitar.setRole(militar.getRole());

            return militarRepository.save(existingMilitar);
        } else {
            return militarRepository.save(militar);
        }
    }
}

