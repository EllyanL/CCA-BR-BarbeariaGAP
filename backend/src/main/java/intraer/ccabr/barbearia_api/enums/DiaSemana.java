package intraer.ccabr.barbearia_api.enums;

import java.text.Normalizer;
import java.util.Arrays;

public enum DiaSemana {
    SEGUNDA("segunda"), TERCA("terca"), QUARTA("quarta"),
    QUINTA("quinta"), SEXTA("sexta");
    private final String valor;
    DiaSemana(String v){ this.valor = v; }
    public String getValor(){ return valor; }
    public static DiaSemana from(String dia){
        String norm = Normalizer.normalize(dia, Normalizer.Form.NFD)
                                .replaceAll("\\p{M}", "").toLowerCase();
        return Arrays.stream(values())
                     .filter(d -> d.valor.equals(norm))
                     .findFirst()
                     .orElseThrow();
    }
}
