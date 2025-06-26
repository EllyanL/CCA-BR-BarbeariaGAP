package intraer.ccabr.barbearia_api.dtos;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WeeklyCountDTO {
    private LocalDate date;
    private long count;
}
