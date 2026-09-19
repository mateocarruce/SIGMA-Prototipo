-- SIGMA: usuarios semilla
-- Password para los 3 usuarios: Sigma2026!  (hash bcrypt real, cost 10)

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
    ('Administrador SIGMA', 'admin@hospital.gob.ec', '$2b$10$r8NKeq8bd6K8RHy9CbUKvOIvNuW3FjLiOR9ecv45qpvCMTsz49Pn2', 'ADMIN'),
    ('María Isabel Torres Salazar', 'auditor@hospital.gob.ec', '$2b$10$r8NKeq8bd6K8RHy9CbUKvOIvNuW3FjLiOR9ecv45qpvCMTsz49Pn2', 'AUDITOR'),
    ('Digitador SIGMA', 'digitador@hospital.gob.ec', '$2b$10$r8NKeq8bd6K8RHy9CbUKvOIvNuW3FjLiOR9ecv45qpvCMTsz49Pn2', 'DIGITADOR');
