// src/main/java/.../global/debug/SessionDebugController.java
package com.lingoguma.detective_backend.global.debug;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class SessionDebugController {
    @GetMapping("/session")
    public ResponseEntity<?> session(HttpSession session) {
        return ResponseEntity.ok(Map.of(
            "id", session.getId(),
            "isNew", session.isNew(),
            "userIndex", session.getAttribute("userIndex")
        ));
    }
}
