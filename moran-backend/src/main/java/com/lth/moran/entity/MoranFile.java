package com.lth.moran.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "files")
@Data
public class MoranFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String path;  // UUID.ext

    private Long size;  // Bytes, null for folder

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "parent_id")
    private Long parentId;  // Self-ref for folders, null for root

    @Column
    private Boolean isFolder = false;  // True for folders
}