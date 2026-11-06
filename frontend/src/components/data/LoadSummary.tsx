import React from 'react';
import { Alert, AlertIcon, Stack, Text } from '@chakra-ui/react';
import { useAppContext } from '../../context/AppContext';
import PanelSection from '../common/PanelSection';

/** 読み込んだデータの概要と警告 */
const LoadSummary: React.FC = () => {
  const { loadSummary } = useAppContext();
  if (!loadSummary) return null;

  return (
    <PanelSection title="読み込み結果">
      <Stack spacing={1} fontSize="sm">
        <Text>
          <b>{loadSummary.total_rows}</b> 行 / {loadSummary.files.length} ファイル / {loadSummary.game_ids.length} 試合
        </Text>
        <Text color="gray.600">チーム: {loadSummary.teams.join('、')}</Text>
        {loadSummary.files.map((f) => (
          <Text key={f.file_name} fontSize="xs" color="gray.500" wordBreak="break-all">
            {f.file_name}（{f.file_format}
            {f.encoding ? ` / ${f.encoding}` : ''}、{f.row_count} 行）
          </Text>
        ))}
        {loadSummary.warnings.map((w) => (
          <Alert key={w} status="warning" fontSize="xs" py={1}>
            <AlertIcon boxSize={3} />
            {w}
          </Alert>
        ))}
      </Stack>
    </PanelSection>
  );
};

export default LoadSummary;
