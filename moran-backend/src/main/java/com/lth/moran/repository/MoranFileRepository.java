package com.lth.moran.repository;

import com.lth.moran.entity.MoranFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MoranFileRepository extends JpaRepository<MoranFile, Long> {
    List<MoranFile> findByUserIdAndParentIdOrderByNameAsc(Long userId, Long parentId);

    @Query("SELECT f FROM MoranFile f WHERE f.user.id = :userId AND f.parentId IS NULL ORDER BY f.name ASC")
    List<MoranFile> findRootFilesByUserId(@Param("userId") Long userId);

    // 递归文件夹查询简化：先实现平级，后期树状
    List<MoranFile> findByParentIdAndIsFolderFalseOrderByUploadTimeDesc(Long parentId);  // Files only
}