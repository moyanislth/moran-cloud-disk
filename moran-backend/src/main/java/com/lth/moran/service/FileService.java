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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;
import java.util.stream.Collectors;

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
        logger.info("Listing files for user {} in parent {}", userId, parentId);
        if (parentId == null) {
            List<MoranFile> files = fileRepository.findRootFilesByUserId(userId);
            logger.info("Root files count for user {}: {}", userId, files.size());
            return validateAndMarkLostFiles(files);
        } else {
            List<MoranFile> files = fileRepository.findByUserIdAndParentIdAndDeletedIsFalseOrderByNameAsc(userId, parentId);
            logger.info("Sub files count for user {} parent {}: {}", userId, parentId, files.size());
            return validateAndMarkLostFiles(files);
        }
    }

    private List<MoranFile> validateAndMarkLostFiles(List<MoranFile> files) {
        return files.stream()
                .peek(file -> {
                    if (!file.getDeleted()) {
                        Path filePath = Paths.get(storagePath, file.getPath());
                        if (!Files.exists(filePath)) {
                            logger.warn("File {} does not exist on disk, marking as lost", file.getId());
                            file.setLost(true);
                        }
                    }
                })
                .collect(Collectors.toList());
    }

    public MoranFile getFileById(Long id) {
        logger.debug("Getting file by ID: {}", id);
        MoranFile file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found: " + id));
        Long userId = getCurrentUserId();
        if (!file.getUser().getId().equals(userId)) {
            logger.warn("Unauthorized access to file {} by user {}", id, userId);
            throw new RuntimeException("Unauthorized access to file");
        }
        if (file.getDeleted()) {
            throw new RuntimeException("File has been deleted");
        }
        Path filePath = Paths.get(storagePath, file.getPath());
        if (!Files.exists(filePath)) {
            logger.warn("File {} does not exist on disk, soft deleting", id);
            softDelete(id);
            throw new RuntimeException("File not found");
        }
        return file;
    }

    public MoranFile uploadFile(MultipartFile file, Long parentId) throws IOException {
        logger.info("Uploading file: {} (size: {}) to parent {}", file.getOriginalFilename(), file.getSize(), parentId);
        try {
            Quota quota = quotaRepository.findById(1L).orElseThrow(() -> new RuntimeException("Quota not found"));
            if (quota.getUsedSpace() + file.getSize() > quota.getTotalSpace()) {
                logger.warn("Quota exceeded for upload: {} bytes", file.getSize());
                throw new RuntimeException("Storage quota exceeded");
            }

            String fullPath = buildFullPath(parentId, null);
            Path dirPath = Paths.get(storagePath, fullPath);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
                logger.info("Created upload dir: {}", dirPath);
            }
            String uuid = UUID.randomUUID().toString();
            String fileExt = Optional.ofNullable(file.getOriginalFilename())
                    .filter(name -> name.contains("."))
                    .map(name -> name.substring(name.lastIndexOf(".")))
                    .orElse("");
            String filePath = fullPath + "/" + uuid + fileExt;

            Path targetLocation = Paths.get(storagePath, filePath);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            logger.debug("File saved to: {}", targetLocation);

            MoranFile moranFile = new MoranFile();
            moranFile.setName(file.getOriginalFilename());
            moranFile.setPath(filePath);
            moranFile.setSize(file.getSize());
            moranFile.setMimeType(file.getContentType());
            moranFile.setUser((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
            moranFile.setParentId(parentId);

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

    private String buildFullPath(Long parentId, String finalName) {
        StringBuilder path = new StringBuilder();
        Long current = parentId;
        while (current != null) {
            Optional<MoranFile> parent = fileRepository.findById(current);
            if (parent.isPresent()) {
                path.insert(0, "/" + parent.get().getName());
                current = parent.get().getParentId();
            } else {
                current = null;
            }
        }
        if (finalName != null) {
            path.append("/" + finalName);
        }
        return path.toString();
    }

    @Transactional
    public MoranFile createFolder(String folderName, Long parentId) {
        logger.info("Creating folder: {} in parent {}", folderName, parentId);
        Long userId = getCurrentUserId();

        // Check for existing active folder with same name
        Optional<MoranFile> existing = fileRepository.findByUserIdAndParentIdAndNameAndDeletedIsFalse(userId, parentId, folderName);
        if (existing.isPresent()) {
            throw new RuntimeException("Folder already exists");
        }

        String fullPath = buildFullPath(parentId, folderName);
        Path targetDir = Paths.get(storagePath, fullPath);
        try {
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
                logger.info("Created folder dir: {}", targetDir);
            }
        } catch (IOException e) {
            logger.error("Failed to create folder dir: {}", e.getMessage());
            throw new RuntimeException("Failed to create folder directory", e);
        }

        MoranFile folder = new MoranFile();
        folder.setName(folderName);
        folder.setPath(fullPath + "/");  // dir end with /
        folder.setIsFolder(true);
        folder.setUser((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        folder.setParentId(parentId);

        MoranFile saved = fileRepository.save(folder);
        logger.info("Folder created: ID {}", saved.getId());
        return saved;
    }

    /**
     * Helper method to get all direct and indirect descendants of a folder (excluding self).
     */
    private List<MoranFile> getDescendants(Long folderId) {
        List<MoranFile> descendants = new ArrayList<>();
        Queue<Long> queue = new ArrayDeque<>();
        queue.add(folderId);

        Long userId = getCurrentUserId();
        while (!queue.isEmpty()) {
            Long currentId = queue.poll();
            List<MoranFile> children = fileRepository.findByUserIdAndParentIdAndDeletedIsFalseOrderByNameAsc(userId, currentId);
            for (MoranFile child : children) {
                descendants.add(child);
                if (child.getIsFolder()) {
                    queue.add(child.getId());
                }
            }
        }
        return descendants;
    }

    @Transactional
    public void softDelete(Long id) {
        MoranFile file = fileRepository.findById(id).orElse(null);
        if (file == null || file.getDeleted()) {
            return;
        }
        file.setDeleted(true);
        fileRepository.save(file);
        if (!file.getIsFolder() && file.getSize() != null) {
            Quota quota = quotaRepository.findById(1L).orElseThrow(() -> new RuntimeException("Quota not found"));
            quota.setUsedSpace(Math.max(0, quota.getUsedSpace() - file.getSize()));
            quotaRepository.save(quota);
            logger.info("Soft deleted file {} and updated quota", id);
        } else {
            logger.info("Soft deleted folder {}", id);
        }
    }

    @Transactional
    public MoranFile renameFile(Long id, String newName) {
        logger.info("Renaming file ID {} to {}", id, newName);
        MoranFile file = getFileById(id);  // Uses validation

        // Prevent empty or invalid name
        if (newName == null || newName.trim().isEmpty()) {
            throw new RuntimeException("Invalid name");
        }

        String oldName = file.getName();
        boolean isFolder = file.getIsFolder() != null && file.getIsFolder();
        String oldSuffix = isFolder ? "/" : "";
        String newSuffix = isFolder ? "/" : "";

        // Build old and new base paths
        String oldBasePath = buildFullPath(file.getParentId(), oldName) + oldSuffix;
        String newBasePath = buildFullPath(file.getParentId(), newName) + newSuffix;

        // Calculate old and new full paths for physical move
        String oldFullPath = file.getPath(); // Already includes suffix for folders
        String newFullPath;
        if (file.getParentId() == null) {
            // Root level
            newFullPath = "/" + newName + newSuffix;
        } else {
            String parentPath = buildFullPath(file.getParentId(), null);
            newFullPath = parentPath + "/" + newName + newSuffix;
        }

        // Physical move
        Path oldPathObj = Paths.get(storagePath, oldFullPath);
        Path newPathObj = Paths.get(storagePath, newFullPath);
        try {
            if (Files.exists(oldPathObj)) {
                // For directories, Files.move will recursively move the entire tree
                Files.move(oldPathObj, newPathObj, StandardCopyOption.REPLACE_EXISTING);
                logger.info("Moved path from {} to {}", oldFullPath, newFullPath);
            }
        } catch (IOException e) {
            logger.error("Failed to move path: {}", e.getMessage());
            throw new RuntimeException("Failed to rename on disk: " + e.getMessage(), e);
        }

        // Update DB: self first
        file.setName(newName);
        file.setPath(newFullPath);
        fileRepository.save(file);

        // If folder, update all descendants' paths
        if (isFolder) {
            List<MoranFile> descendants = getDescendants(id);
            for (MoranFile desc : descendants) {
                String oldDescPath = desc.getPath();
                // Compute relative path and rebuild
                if (oldDescPath.startsWith(oldBasePath)) {
                    String relativePath = oldDescPath.substring(oldBasePath.length());
                    String newDescPath = newBasePath + relativePath;
                    desc.setPath(newDescPath);
                    fileRepository.save(desc);
                    logger.debug("Updated descendant path: {} -> {}", oldDescPath, newDescPath);
                }
            }
            logger.info("Updated {} descendant paths for renamed folder {}", descendants.size(), id);
        }

        MoranFile updated = file;
        logger.info("Rename successful: ID {}", id);
        return updated;
    }

    public byte[] downloadFile(Long id) throws IOException {
        logger.debug("Downloading file ID: {}", id);
        MoranFile file = getFileById(id);  // Uses validation
        if (file.getIsFolder()) {
            throw new RuntimeException("Cannot download folder");
        }
        return Files.readAllBytes(Paths.get(storagePath, file.getPath()));
    }

    @Transactional
    public void deleteFile(Long id) throws IOException {
        logger.info("Deleting file ID: {}", id);
        MoranFile file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found: " + id));
        Long userId = getCurrentUserId();
        if (!file.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        if (file.getDeleted()) {
            throw new RuntimeException("File already deleted");
        }

        // Physical delete if exists
        Path filePath = Paths.get(storagePath, file.getPath());
        boolean existsOnDisk = Files.exists(filePath);
        if (existsOnDisk) {
            if (file.getIsFolder()) {
                Files.walk(filePath).sorted((p1, p2) -> -p1.compareTo(p2)).forEach(p -> {
                    try {
                        Files.delete(p);
                    } catch (IOException e) {
                        logger.error("Failed to delete path: {}", p, e);
                    }
                });
                logger.warn("Folder and contents deleted for ID: {}", id);
            } else {
                Files.delete(filePath);
                logger.debug("File physically deleted");
            }
        } else {
            logger.warn("File {} already missing on disk", id);
        }

        // Soft delete (marks as deleted, adjusts quota)
        softDelete(id);

        // For folders, hard delete the DB record to release the unique path constraint
        if (file.getIsFolder()) {
            fileRepository.delete(file);
            logger.info("Hard deleted folder record {} to release path constraint", id);
        }

        logger.info("Delete successful: ID {}", id);
    }

    public Quota getQuota() {
        logger.debug("Fetching quota");
        return quotaRepository.findById(1L).orElse(new Quota());
    }

    public List<MoranFile> getPathChain(Long id) {
        List<MoranFile> chain = new ArrayList<>();
        Long current = id;
        while (current != null) {
            MoranFile parent = fileRepository.findById(current).orElse(null);
            if (parent != null && !parent.getDeleted()) {
                Path parentPath = Paths.get(storagePath, parent.getPath());
                if (Files.exists(parentPath)) {
                    chain.add(0, parent);
                    current = parent.getParentId();
                } else {
                    logger.warn("Path chain broken at {}, marking as lost", current);
                    parent.setLost(true);
                    chain.add(0, parent);
                    current = parent.getParentId();  // Continue but mark
                }
            } else {
                current = null;
            }
        }
        return chain;
    }
}