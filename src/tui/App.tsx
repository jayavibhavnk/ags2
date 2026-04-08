import React, { useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Swarm } from '../core/orchestrator.js';
import { useSwarm } from './hooks/useSwarm.js';
import { Header } from './components/Header.js';
import { AgentList } from './components/AgentList.js';
import { OutputPanel } from './components/OutputPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { PhaseBar } from './components/PhaseBar.js';
import { theme } from './theme.js';

interface Props {
  swarm: Swarm;
  projectName: string;
  onDone?: (success: boolean) => void;
  onAbort?: () => void;
}

export function App({ swarm, projectName, onDone, onAbort }: Props): React.ReactElement {
  const { exit } = useApp();
  const {
    state,
    agents,
    focusedId,
    focusedAgent,
    done,
    summary,
    focusByIndex,
  } = useSwarm(swarm);

  // Keyboard handling
  useInput((input, key) => {
    // Number keys → focus agent
    const n = parseInt(input, 10);
    if (!isNaN(n) && n >= 1 && n <= agents.length) {
      focusByIndex(n);
      return;
    }

    if (input === 'q' || key.escape) {
      exit();
      onDone?.(state.phase === 'done');
      return;
    }

    if (input === 'a') {
      swarm.abort();
      onAbort?.();
      return;
    }
  });

  // Exit automatically when done
  useEffect(() => {
    if (done) {
      onDone?.(state.phase === 'done');
    }
  }, [done, state.phase, onDone]);

  return (
    <Box flexDirection="column" width="100%">
      {/* Header bar */}
      <Header state={state} projectName={projectName} />

      {/* Phase progress */}
      <PhaseBar phase={state.phase} />

      {/* Main layout */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: agent list */}
        <Box width={40} flexDirection="column">
          <AgentList
            agents={agents}
            focusedId={focusedId}
          />
        </Box>

        {/* Right: output panel */}
        <Box flexGrow={1} flexDirection="column">
          <OutputPanel agent={focusedAgent} maxLines={35} />
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar state={state} focusedAgent={focusedId} />

      {/* Done / failure banner */}
      {done && (
        <Box
          paddingX={2}
          paddingY={0}
          borderStyle="single"
          borderColor={state.phase === 'done' ? theme.status.done : theme.status.failed}
        >
          <Text
            bold
            color={state.phase === 'done' ? theme.status.done : theme.status.failed}
          >
            {state.phase === 'done' ? '✓ Complete' : '✗ Failed'}
          </Text>
          {summary && (
            <Text color={theme.muted}> — {summary}</Text>
          )}
          <Text color={theme.dim}>  Press q to exit.</Text>
        </Box>
      )}
    </Box>
  );
}
