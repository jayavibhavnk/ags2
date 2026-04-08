import React from 'react';
import { Box, Text } from 'ink';
import type { SwarmState } from '../../types.js';
import { theme, PHASE_LABELS } from '../theme.js';

const PHASES: SwarmState['phase'][] = [
  'init',
  'architecting',
  'coding',
  'reviewing',
  'testing',
  'debugging',
  'done',
];

function phaseIndex(phase: SwarmState['phase']): number {
  return PHASES.indexOf(phase);
}

interface Props {
  phase: SwarmState['phase'];
}

export function PhaseBar({ phase }: Props): React.ReactElement {
  const currentIndex = phaseIndex(phase);

  return (
    <Box paddingX={1} gap={0}>
      {PHASES.filter((p) => p !== 'init' && p !== 'done').map((p, i) => {
        const idx = phaseIndex(p);
        const isCurrent = p === phase;
        const isPast = idx < currentIndex;
        const color = isCurrent
          ? theme.phases[p]
          : isPast
          ? theme.status.done
          : theme.dim;

        return (
          <React.Fragment key={p}>
            <Box>
              <Text color={color} bold={isCurrent}>
                {isPast ? '✓' : isCurrent ? '◈' : '○'} {PHASE_LABELS[p] ?? p}
              </Text>
            </Box>
            {i < 4 && (
              <Text color={theme.dim}> → </Text>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
