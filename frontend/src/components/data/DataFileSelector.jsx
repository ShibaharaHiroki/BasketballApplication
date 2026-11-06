import { Button, Checkbox, CheckboxGroup, Stack, Text } from '@chakra-ui/react';
import { useAppContext } from '../../context/AppContext';
import { useLoadSelectedFiles } from '../../hooks/useDataActions';
import { formatBytes } from '../../utils/format';
import PanelSection from '../common/PanelSection';

/** 公開されている試合データを選んで読み込む */
const DataFileSelector = () => {
  const { dataFiles, selectedFileNames, setSelectedFileNames, isLoading } = useAppContext();
  const loadSelectedFiles = useLoadSelectedFiles();

  return (
    <PanelSection title="試合データ">
      {dataFiles.length === 0 ? (
        <Text fontSize="sm" color="gray.500" mb={2}>
          試合データがありません
        </Text>
      ) : (
        <CheckboxGroup value={selectedFileNames} onChange={(v) => setSelectedFileNames(v)}>
          <Stack spacing={1} mb={3}>
            {dataFiles.map((f) => (
              <Checkbox key={f.file_name} value={f.file_name} size="sm">
                <Text fontSize="sm" wordBreak="break-all">
                  {f.file_name}{' '}
                  <Text as="span" fontSize="xs" color="gray.500">
                    ({formatBytes(f.size_bytes)})
                  </Text>
                </Text>
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      )}
      <Button
        colorScheme="blue"
        size="sm"
        w="100%"
        onClick={loadSelectedFiles}
        isLoading={isLoading}
        isDisabled={selectedFileNames.length === 0}
      >
        読み込む
      </Button>
    </PanelSection>
  );
};

export default DataFileSelector;
