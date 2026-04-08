import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { AgentInstance } from '../../types.js';
import { theme, ROLE_LABELS, STATUS_ICONS } from '../theme.js';

interface Props {
  agents: AgentInstance[];
  focusedId: string | null;
}

function instanceSuffix(id: string): string {
  const n = id.match(/-(\d+)$/)?.[1];
  return n && parseInt(n, 10) > 1 ? ` #${n}` : '';
}

function AgentRow({
  agent,
  isFocused,
  index,
}: {
  agent: AgentInstance;
  isFocused: boolean;
  index: number;
}): React.ReactElement {
  const roleColor = theme.roles[agent.role] ?? theme.muted;
  const statusColor = theme.status[agent.status] ?? theme.muted;
  const isActive = agent.status === 'working' || agent.status === 'thinking';
  const label = (ROLE_LABELS[agent.role] ?? agent.role) + instanceSuffix(agent.id);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box gap={1}>
        {/* Key hint */}
        <Text color={theme.dim}>[{index}]</Text>

        {/* Status spinner / icon */}
        {isActive ? (
          <Text color={statusColor}><Spinner type="dots" /></Text>
        ) : (
          <Text color={statusColor}>{STATUS_ICONS[agent.status] ?? '○'}</Text>
        )}

        {/* Role name */}
        <Text color={isFocused ? 'white' : roleColor} bold={isFocused}>
          {label}
        </Text>

        {/* Tool */}
        <Text color={theme.dim}>{agent.tool}</Text>
      </Box>

      {/* Task preview on second line when focused */}
      {isFocused && agent.currentTask && (
        <Box paddingLeft={6}>
          <Text color={theme.muted} dimColor wrap="truncate">
            {agent.currentTask.slice(0, 50)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export function AgentList({ agents, focusedId }: Props): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.dim}
    >
      <Box paddingX={1}>
        <Text bold color={theme.muted}>AGENTS</Text>
      </Box>

      <Box flexDirection="column" paddingY={0}>
        {agents.map((agent, i) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            isFocused={agent.id === focusedId}
            index={i + 1}
          />
        ))}
      </Box>
    </Box>
  );
}
