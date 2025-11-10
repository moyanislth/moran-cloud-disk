package com.lth.moran.repository;

import com.lth.moran.entity.MoranFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MoranFileRepository extends JpaRepository<MoranFile, Long> {
    List<MoranFile> findByUserIdAndParentIdAndDeletedIsFalseOrderByNameAsc(Long userId, Long parentId);

    @Query("SELECT f FROM MoranFile f WHERE f.user.id = :userId AND f.parentId IS NULL AND f.deleted = false ORDER BY f.name ASC")
    List<MoranFile> findRootFilesByUserId(@Param("userId") Long userId);

    List<MoranFile> findByParentIdAndIsFolderFalseAndDeletedIsFalseOrderByUploadTimeDesc(Long parentId);  // Files only

    Optional<MoranFile> findByUserIdAndParentIdAndNameAndDeletedIsFalse(Long userId, Long parentId, String name);
}