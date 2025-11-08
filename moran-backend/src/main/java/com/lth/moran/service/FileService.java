package com.lth.moran.service;

import com.lth.moran.entity.MoranFile;
import com.lth.moran.entity.Quota;
import com.lth.moran.entity.User;
import com.lth.moran.repository.MoranFileRepository;
import com.lth.moran.repository.QuotaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class FileService {

    private static final Logger logger = LoggerFactory.getLogger(FileService.class);

    private final MoranFileRepository fileRepository;
    private final QuotaRepository quotaRepository;

    @Value("${storage.path}")
    private String storagePath;

    public FileService(MoranFileRepository fileRepository, QuotaRepository quotaRepository) {
        this.fileRepository = fileRepository;
        this.quotaRepository = quotaRepository;
    }

    private Long getCurrentUserId() {
        try {
            return ((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
        } catch (Exception e) {
            logger.error("Failed to get current user ID", e);
            throw new RuntimeException("Unauthorized access");
        }
    }

    public List<MoranFile> listFiles(Long parentId) {
        Long userId = getCurrentUserId();
        if (parentId == null) {
            parentId = 0L;  // Root
        }
        logger.debug("Listing files for user {} in parent {}", userId, parentId);
        return fileRepository.findByUserIdAndParentIdOrderByNameAsc(userId, parentId);
    }

    public MoranFile uploadFile(MultipartFile file, Long parentId) throws IOException {
        logger.info("Uploading file: {} (size: {}) to parent {}", file.getOriginalFilename(), file.getSize(), parentId);
        try {
            Quota quota = quotaRepository.findById(1L).orElseThrow(() -> new RuntimeException("Quota not found"));
            if (quota.getUsedSpace() + file.getSize() > quota.getTotalSpace()) {
                logger.warn("Quota exceeded for upload: {} bytes", file.getSize());
                throw new RuntimeException("Storage quota exceeded");
            }

            String uuid = UUID.randomUUID().toString();
            String fileExt = Optional.ofNullable(file.getOriginalFilename())
                    .filter(name -> name.contains("."))
                    .map(name -> name.substring(name.lastIndexOf(".")))
                    .orElse("");
            String filePath = uuid + fileExt;

            Path targetLocation = Paths.get(storagePath).resolve(filePath);
            if (!Files.exists(Paths.get(storagePath))) {
                Files.createDirectories(Paths.get(storagePath));
                logger.info("Created storage dir: {}", storagePath);
            }
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            logger.debug("File saved to: {}", targetLocation);

            MoranFile moranFile = new MoranFile();
            moranFile.setName(file.getOriginalFilename());
            moranFile.setPath(filePath);
            moranFile.setSize(file.getSize());
            moranFile.setMimeType(file.getContentType());
            moranFile.setUser((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
            moranFile.setParentId(parentId != null ? parentId : null);

            MoranFile saved = fileRepository.save(moranFile);
            quota.setUsedSpace(quota.getUsedSpace() + file.getSize());
            quotaRepository.save(quota);
            logger.info("Upload successful: file ID {}", saved.getId());
            return saved;
        } catch (IOException e) {
            logger.error("IO error during upload: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Upload failed: {}", e.getMessage());
            throw new RuntimeException("Upload failed: " + e.getMessage(), e);
        }
    }

    public MoranFile createFolder(String folderName, Long parentId) {
        logger.info("Creating folder: {} in parent {}", folderName, parentId);
        MoranFile folder = new MoranFile();
        folder.setName(folderName);
        folder.setPath(UUID.randomUUID().toString());  // Dummy path for folder
        folder.setIsFolder(true);
        folder.setUser((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        folder.setParentId(parentId != null ? parentId : null);
        MoranFile saved = fileRepository.save(folder);
        logger.info("Folder created: ID {}", saved.getId());
        return saved;
    }

    public byte[] downloadFile(Long id) throws IOException {
        logger.debug("Downloading file ID: {}", id);
        MoranFile file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found"));
        if (file.getIsFolder()) {
            throw new RuntimeException("Cannot download folder");
        }
        Long userId = getCurrentUserId();
        if (!file.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        return Files.readAllBytes(Paths.get(storagePath, file.getPath()));
    }

    public void deleteFile(Long id) throws IOException {
        logger.info("Deleting file ID: {}", id);
        MoranFile file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found"));
        Long userId = getCurrentUserId();
        if (!file.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (file.getIsFolder()) {
            // 简化：仅删空文件夹，后期递归
            logger.warn("Folder delete not implemented fully for ID: {}", id);
        } else {
            Quota quota = quotaRepository.findById(1L).orElseThrow(() -> new RuntimeException("Quota not found"));
            quota.setUsedSpace(Math.max(0, quota.getUsedSpace() - file.getSize()));
            quotaRepository.save(quota);
            Files.delete(Paths.get(storagePath, file.getPath()));
            logger.debug("File deleted and quota updated");
        }
        fileRepository.delete(file);
        logger.info("Delete successful: ID {}", id);
    }

    public MoranFile renameFile(Long id, String newName) {
        logger.info("Renaming file ID {} to {}", id, newName);
        MoranFile file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found"));
        Long userId = getCurrentUserId();
        if (!file.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        file.setName(newName);
        MoranFile updated = fileRepository.save(file);
        logger.info("Rename successful: ID {}", id);
        return updated;
    }

    public Quota getQuota() {
        logger.debug("Fetching quota");
        return quotaRepository.findById(1L).orElse(new Quota());
    }
}