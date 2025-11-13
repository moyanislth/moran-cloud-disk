import React from 'react';
import { Skeleton, Table, TableBody, TableCell, TableRow } from '@mui/material';

/**
 * FileTableSkeleton 组件 - 文件表格加载骨架
 * 功能：模拟 DataGrid 加载状态，提供占位 UI，提升感知性能。
 * 逻辑：渲染 5 行 Skeleton 表格行，覆盖 ID/名称/大小/时间/操作列。
 * 使用：isLoading 时替换 <FileTable />。
 */
function FileTableSkeleton() {
  return (
    <Table sx={{ minWidth: 650 }}>
      <TableBody>
        {[...Array(5)].map((_, index) => (
          <TableRow key={index}>
            <TableCell><Skeleton variant="text" width={60} /></TableCell>
            <TableCell>
              <Skeleton variant="text" width="80%" />
            </TableCell>
            <TableCell><Skeleton variant="text" width={80} /></TableCell>
            <TableCell><Skeleton variant="text" width={120} /></TableCell>
            <TableCell><Skeleton variant="text" width={120} /></TableCell>
            <TableCell>
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="circular" width={20} height={20} sx={{ ml: 1 }} />
              <Skeleton variant="circular" width={20} height={20} sx={{ ml: 1 }} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default FileTableSkeleton;