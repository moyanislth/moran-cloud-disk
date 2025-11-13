package com.lth.moran.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class JwtUtil {
    public static final int MIN_LENGTH = 32;
    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    /** 构造签名密钥 */
    private SecretKey getKey() {
        try {
            byte[] keyBytes;
            // 步骤1: 尝试Base64解码（如果secret是预编码密钥）
            try {
                keyBytes = Base64.getDecoder().decode(secret);
                if (keyBytes.length < MIN_LENGTH) {
                    throw new IllegalArgumentException("Base64 decoded key too short: " + keyBytes.length + " bytes");
                }
                logger.debug("Using Base64 decoded key (length: {} bytes)", keyBytes.length);
            } catch (IllegalArgumentException e) {
                // 步骤2: secret作为种子，SHA-256 hash + 盐扩展到32字节
                logger.debug("Base64 decode failed, using secret as seed for SHA-256 hashing");
                keyBytes = hashSecretToKeyBytes(secret);
            }
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            logger.error("构造JWT密钥失败: {}", e.getMessage());
            throw new RuntimeException("Failed to create JWT key", e);
        }
    }

    /** 以secret作为种子，SHA-256 hash扩展到32字节（种子生成核心） */
    private byte[] hashSecretToKeyBytes(String seed) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        // 简单盐：用expiration作为盐
        byte[] input = (seed + expiration).getBytes(StandardCharsets.UTF_8);
        byte[] hash = digest.digest(input);
        if (hash.length < MIN_LENGTH) {
            // 双hash确保
            hash = digest.digest(hash);
        }
        logger.debug("Generated key bytes from seed (length: {} bytes)", hash.length);
        return hash;
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        // Add role claim for easier extraction
        String role = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));
        claims.put("role", role);
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        SecretKey key = getKey();
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /** 泛型提取claim */
    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(parseAllClaims(token));
    }

    /** 提取用户名 */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /** 提取角色 */
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    /** 提取过期时间 */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /** 验证Token并匹配用户名 */
    public Boolean validateToken(String token, UserDetails userDetails) {
        try {
            // 提取 claims
            Claims claims = parseAllClaims(token);
            final String extractedUsername = claims.getSubject();
            if (!extractedUsername.equals(userDetails.getUsername())) {
                logger.warn("Token用户名不匹配: expected={}, actual={}", userDetails.getUsername(), extractedUsername);
                return false;
            }
            if (isTokenExpired(token)) {
                logger.warn("Token已过期: {}", userDetails.getUsername());
                return false;
            }
            logger.debug("Token validated for user: {}, role: {}", userDetails.getUsername(), extractRole(token));
            return true;
        } catch (SignatureException e) {
            logger.error("JWT签名无效: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("Token验证失败: {}", e.getMessage());
        }
        return false;
    }

    /** 内部解析方法 */
    private Claims parseAllClaims(String token) {
        SecretKey key = getKey();
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    /** 是否过期 */
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}