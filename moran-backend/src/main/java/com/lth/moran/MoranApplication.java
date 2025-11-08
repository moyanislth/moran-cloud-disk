package com.lth.moran;

import com.lth.moran.entity.Quota;
import com.lth.moran.entity.User;
import com.lth.moran.repository.QuotaRepository;
import com.lth.moran.repository.UserRepository;
import com.lth.moran.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class MoranApplication implements CommandLineRunner {

    private final UserRepository userRepository;
    private final QuotaRepository quotaRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    public MoranApplication(UserRepository userRepository, QuotaRepository quotaRepository,
                            AuthService authService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.quotaRepository = quotaRepository;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
    }

    public static void main(String[] args) {
        SpringApplication.run(MoranApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        // 默认admin
        User admin = authService.registerOrGetUser("admin", "admin");
        if (admin.getPassword().startsWith("$2b$")) {  // 已hash
            System.out.println("Default admin exists: admin/admin");
        }

        // 默认quota
        if (quotaRepository.findById(1L).isEmpty()) {
            Quota quota = new Quota();
            quota.setTotalSpace(10737418240L);  // 10GB
            quotaRepository.save(quota);
        }
    }
}