import React from 'react';
import { Badge, Button, HStack, Spinner, Text } from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useAppContext } from '../../context/AppContext';
import { useReloadBackendInfo } from '../../hooks/useDataActions';
import PanelSection from '../common/PanelSection';

/** バックエンドとの接続状態と、再取得ボタン */
const ConnectionStatus: React.FC = () => {
  const { health, isLoading, error } = useAppContext();
  const reload = useReloadBackendInfo();

  return (
    <PanelSection
      title="バックエンド接続"
      divider
      actions={
        <Button size="xs" leftIcon={<RepeatIcon />} onClick={reload} isDisabled={isLoading}>
          再取得
        </Button>
      }
    >
      {isLoading && !health ? (
        <Spinner size="sm" />
      ) : health ? (
        <HStack fontSize="sm">
          <Badge colorScheme="green">{health.status}</Badge>
          <Text color="gray.600">v{health.version}</Text>
        </HStack>
      ) : error ? (
        <Badge colorScheme="red">接続エラー</Badge>
      ) : (
        <Text fontSize="sm" color="gray.500">
          未取得
        </Text>
      )}
    </PanelSection>
  );
};

export default ConnectionStatus;
