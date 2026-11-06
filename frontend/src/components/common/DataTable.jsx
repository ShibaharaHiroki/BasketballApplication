import { Table, TableContainer, Tbody, Td, Tfoot, Th, Thead, Tr } from '@chakra-ui/react';

/** 列定義を渡すだけで表を描く汎用テーブル。見出しは上に固定される */
function DataTable({ columns, rows, getRowKey, footerRows = [], fill = true, dense = false }) {
  const cellPx = dense ? 2 : undefined;
  const renderRow = (row, key, bold = false) => (
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
