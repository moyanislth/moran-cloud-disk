package com.lth.moran.controller;

import com.lth.moran.entity.MoranFile;
import com.lth.moran.entity.Quota;
import com.lth.moran.service.FileService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @GetMapping
    public ResponseEntity<List<MoranFile>> listFiles(@RequestParam(required = false) Long parentId) {
        List<MoranFile> files = fileService.listFiles(parentId);
        return ResponseEntity.ok(files);
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MoranFile> upload(@RequestParam("file") MultipartFile file,
                                            @RequestParam(required = false) Long parentId) throws IOException {
        MoranFile saved = fileService.uploadFile(file, parentId);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/folder")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MoranFile> createFolder(@RequestBody CreateFolderRequest request) {
        MoranFile folder = fileService.createFolder(request.getName(), request.getParentId());
        return ResponseEntity.ok(folder);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ByteArrayResource> download(@PathVariable Long id) throws IOException {
        byte[] data = fileService.downloadFile(id);
        ByteArrayResource resource = new ByteArrayResource(data);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + data.length + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ByteArrayResource> preview(@PathVariable Long id) throws IOException {
        MoranFile file = fileService.getFileById(id);
        if (file.getIsFolder()) {
            throw new RuntimeException("Cannot preview folder");
        }
        byte[] data = fileService.downloadFile(id);
        ByteArrayResource resource = new ByteArrayResource(data);
        String mimeType = file.getMimeType();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.parseMediaType(mimeType != null ? mimeType : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .body(resource);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) throws IOException {
        fileService.deleteFile(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/rename")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MoranFile> rename(@PathVariable Long id, @RequestBody RenameRequest request) {
        MoranFile updated = fileService.renameFile(id, request.getNewName());
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/quota")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Quota> getQuota() {
        return ResponseEntity.ok(fileService.getQuota());
    }

    @GetMapping("/path/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MoranFile>> getPathChain(@PathVariable Long id) {
        List<MoranFile> chain = fileService.getPathChain(id);
        return ResponseEntity.ok(chain);
    }
    static class CreateFolderRequest {
        private String name;
        private Long parentId;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Long getParentId() { return parentId; }
        public void setParentId(Long parentId) { this.parentId = parentId; }
    }

    static class RenameRequest {
        private String newName;
        public String getNewName() { return newName; }
        public void setNewName(String newName) { this.newName = newName; }
    }
}