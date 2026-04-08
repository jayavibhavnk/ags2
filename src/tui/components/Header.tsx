import React from 'react';
import { Box, Text } from 'ink';
import type { SwarmState } from '../../types.js';
import { theme, PHASE_LABELS } from '../theme.js';

interface Props {
  state: SwarmState;
  projectName: string;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function Header({ state, projectName }: Props): React.ReactElement {
  const elapsed = Date.now() - state.startedAt;
  const phase = state.phase;
  const phaseColor = theme.phases[phase] ?? theme.muted;
  const phaseLabel = PHASE_LABELS[phase] ?? phase;

  const taskPreview =
    state.userTask.length > 50
      ? state.userTask.slice(0, 47) + '...'
      : state.userTask;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.accent}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        {/* Left: branding + project */}
        <Box gap={1}>
          <Text bold color={theme.accent}>
            ags
          </Text>
          <Text color={theme.dim}>◆</Text>
          <Text bold color="white">
            {projectName}
          </Text>
          <Text color={theme.dim}>◆</Text>
          <Text color="#9CA3AF" italic>
            "{taskPreview}"
          </Text>
        </Box>

        {/* Right: phase + metrics */}
        <Box gap={2}>
          <Box gap={1}>
            <Text color={phaseColor} bold>
              ◈
            </Text>
            <Text color={phaseColor}>{phaseLabel}</Text>
          </Box>
          <Text color={theme.muted}>
            {formatCost(state.totalCost)}
          </Text>
          <Text color={theme.muted}>
            ⏱ {formatElapsed(elapsed)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
