import React, { ReactNode } from 'react';
import { Table, TableContainer, Tbody, Td, Tfoot, Th, Thead, Tr } from '@chakra-ui/react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  isNumeric?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  /** 合計行など、表の下に太字で固定表示する行 */
  footerRows?: T[];
  /** true のとき高さいっぱいに広がり、中身だけスクロールする（false なら内容の高さ） */
  fill?: boolean;
  /** 列の左右の余白を詰める（列の多い表・狭いパネル向け） */
  dense?: boolean;
}

/** 列定義を渡すだけで表を描く汎用テーブル。見出しは上に固定される */
function DataTable<T>({ columns, rows, getRowKey, footerRows = [], fill = true, dense = false }: DataTableProps<T>) {
  const cellPx = dense ? 2 : undefined;
  const renderRow = (row: T, key: string | number, bold = false) => (
    <Tr key={key} fontWeight={bold ? 'bold' : undefined}>
      {columns.map((col) => (
        <Td key={col.key} isNumeric={col.isNumeric} px={cellPx}>
          {col.render(row)}
        </Td>
      ))}
    </Tr>
  );

  return (
    <TableContainer
      flex={fill ? '1' : undefined}
      overflowY={fill ? 'auto' : undefined}
      border="1px"
      borderColor="gray.200"
      borderRadius="md"
    >
      <Table size="sm" variant="striped">
        <Thead position="sticky" top={0} bg="white" zIndex={1}>
          <Tr>
            {columns.map((col) => (
              <Th key={col.key} isNumeric={col.isNumeric} px={cellPx}>
                {col.header}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>{rows.map((row, i) => renderRow(row, getRowKey(row, i)))}</Tbody>
        {footerRows.length > 0 && (
          <Tfoot bg="gray.100">{footerRows.map((row, i) => renderRow(row, `footer-${i}`, true))}</Tfoot>
        )}
      </Table>
    </TableContainer>
  );
}

export default DataTable;
