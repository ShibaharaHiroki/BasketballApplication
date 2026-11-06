import { HStack } from '@chakra-ui/react';
import { useAppContext } from '../../context/AppContext';
import { formatQuarter, playerLabel } from '../../utils/format';
import SelectFilter from '../common/SelectFilter';
import ToggleFilter from '../common/ToggleFilter';

// 選手の選択肢の値（チーム名と背番号をつなげる）
const PLAYER_KEY_SEPARATOR = '|';

/**
 * 共通の絞り込み条件（AppContext の eventFilter）を編集するバー。
 * シュートチャート・ボックススコア・データの各画面で同じ条件を使う。
 */
const EventFilterBar = () => {
  const { loadSummary, eventFilter, setEventFilter, setEventsOffset, activeView } = useAppContext();
  if (!loadSummary) return null;

  const update = (patch) => {
    setEventFilter({ ...eventFilter, ...patch });
    setEventsOffset(0);
  };
  // 選手の選択肢（チームを選んでいるときはそのチームの選手だけ、選んでいないときは両チームの選手）
  const playerOptions = loadSummary.players
    .filter((p) => !eventFilter.team || p.team === eventFilter.team)
    .map((p) => ({
      value: `${p.team}${PLAYER_KEY_SEPARATOR}${p.jersey_number}`,
      label: eventFilter.team ? playerLabel(p.jersey_number) : `${p.team} ${playerLabel(p.jersey_number)}`,
    }));
  const selectedPlayer =
    eventFilter.team && eventFilter.jersey_number
      ? `${eventFilter.team}${PLAYER_KEY_SEPARATOR}${eventFilter.jersey_number}`
      : null;
  // 選手を選ぶと、その選手のチームも絞り込み条件に入る
  const handlePlayerChange = (value) => {
    if (value == null) {
      update({ jersey_number: null });
      return;
    }
    const [team, jersey_number] = value.split(PLAYER_KEY_SEPARATOR);
    update({ team, jersey_number });
  };

  return (
    <HStack spacing={3} flexWrap="wrap">
      {loadSummary.game_ids.length > 1 && (
        <SelectFilter
          placeholder="すべての試合"
          options={loadSummary.game_ids.map((g) => ({ value: g, label: `試合 ${g}` }))}
          value={eventFilter.game_id}
          onChange={(game_id) => update({ game_id })}
        />
      )}
      <SelectFilter
        placeholder="すべてのチーム"
        options={loadSummary.teams.map((t) => ({ value: t, label: t }))}
        value={eventFilter.team}
        // チームを変えたら選手の選択は外す
        onChange={(team) => update({ team, jersey_number: null })}
      />
      <SelectFilter placeholder="全選手" options={playerOptions} value={selectedPlayer} onChange={handlePlayerChange} />
      <SelectFilter
        placeholder="全クォーター"
        options={loadSummary.quarters.map((q) => ({ value: q, label: formatQuarter(q) }))}
        value={eventFilter.quarter}
        onChange={(quarter) => update({ quarter })}
      />
      {activeView === 'events' && (
        <ToggleFilter
          id="shots-only"
          label="シュートのみ"
          isChecked={!!eventFilter.shots_only}
          onChange={(shots_only) => update({ shots_only })}
        />
      )}
    </HStack>
  );
};

export default EventFilterBar;
