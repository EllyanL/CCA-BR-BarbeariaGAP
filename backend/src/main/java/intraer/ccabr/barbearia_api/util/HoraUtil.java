package intraer.ccabr.barbearia_api.util;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public final class HoraUtil {
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private HoraUtil() {
        // Utility class
    }

    public static String format(LocalTime time) {
        return time.format(TIME_FORMATTER);
    }
}
