package com.lth.moran.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "quota")
@Data
public class Quota {
    @Id
    private Long id = 1L;  // Single row

    @Column(name = "total_space")
    private Long totalSpace;

    @Column(name = "used_space")
    private Long usedSpace = 0L;
}