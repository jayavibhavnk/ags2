import React from 'react';
import { Box, Text } from 'ink';
import type { SwarmState } from '../../types.js';
import { theme } from '../theme.js';

interface Props {
  state: SwarmState;
  focusedAgent: string | null;
}

export function StatusBar({ state, focusedAgent }: Props): React.ReactElement {
  const agentCount = Object.keys(state.agents).length;
  const activeCount = Object.values(state.agents).filter(
    (a) => a.status === 'working' || a.status === 'thinking'
  ).length;
  const doneCount = Object.values(state.agents).filter(
    (a) => a.status === 'done'
  ).length;

  return (
    <Box
      paddingX={1}
      justifyContent="space-between"
      borderStyle="single"
      borderColor={theme.dim}
    >
      {/* Left: shortcuts */}
      <Box gap={2}>
        <Text color={theme.dim}>
          <Text color={theme.muted}>[1-{agentCount}]</Text> focus agent
        </Text>
        <Text color={theme.dim}>
          <Text color={theme.muted}>[q]</Text> quit
        </Text>
        <Text color={theme.dim}>
          <Text color={theme.muted}>[a]</Text> abort
        </Text>
      </Box>

      {/* Right: agent summary */}
      <Box gap={2}>
        <Text color={theme.muted}>
          <Text color={theme.status.working}>{activeCount}</Text> active
        </Text>
        <Text color={theme.muted}>
          <Text color={theme.status.done}>{doneCount}</Text>/{agentCount} done
        </Text>
        {state.revisionLoops > 0 && (
          <Text color={theme.status.reviewing}>
            rev #{state.revisionLoops}
          </Text>
        )}
      </Box>
    </Box>
  );
}
