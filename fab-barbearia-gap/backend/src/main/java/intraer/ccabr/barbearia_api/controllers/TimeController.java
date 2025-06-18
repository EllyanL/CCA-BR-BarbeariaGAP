package intraer.ccabr.barbearia_api.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/time")
public class TimeController {

    @GetMapping
    public Map<String, Long> getCurrentTime() {
        return Map.of("timestamp", System.currentTimeMillis());
    }
}
