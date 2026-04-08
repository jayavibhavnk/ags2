import React from 'react';
import { Box, Text } from 'ink';
import type { AgentInstance, AgentOutputLine } from '../../types.js';
import { theme, ROLE_LABELS, OUTPUT_ICONS } from '../theme.js';

interface Props {
  agent: AgentInstance | null;
  maxLines?: number;
}

function OutputLine({ line }: { line: AgentOutputLine }): React.ReactElement {
  const color = theme.output[line.type] ?? theme.output.text;
  const icon = OUTPUT_ICONS[line.type] ?? ' ';

  return (
    <Box>
      <Text color={theme.dim}>{icon} </Text>
      {line.type === 'tool_use' && line.toolName && (
        <Text color={theme.roles.architect}>[{line.toolName}] </Text>
      )}
      <Text color={color} wrap="truncate">
        {line.content}
      </Text>
    </Box>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text color={theme.dim}>No agent selected</Text>
      <Text color={theme.dim} dimColor>
        Press a number key to focus an agent
      </Text>
    </Box>
  );
}

export function OutputPanel({ agent, maxLines = 30 }: Props): React.ReactElement {
  if (!agent) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor={theme.dim} flexGrow={1}>
        <Box paddingX={1}>
          <Text bold color={theme.muted}>
            OUTPUT
          </Text>
        </Box>
        <EmptyState />
      </Box>
    );
  }

  const roleColor = theme.roles[agent.role] ?? theme.muted;
  const lines = agent.output.slice(-maxLines);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={roleColor}
      flexGrow={1}
    >
      {/* Panel header */}
      <Box paddingX={1} gap={1}>
        <Text bold color={roleColor}>
          {ROLE_LABELS[agent.role] ?? agent.role}
        </Text>
        <Text color={theme.dim}>·</Text>
        <Text color={theme.dim}>{agent.tool}</Text>
        {agent.model && (
          <>
            <Text color={theme.dim}>·</Text>
            <Text color={theme.dim}>{agent.model}</Text>
          </>
        )}
        {agent.cost != null && agent.cost > 0 && (
          <>
            <Text color={theme.dim}>·</Text>
            <Text color={theme.muted}>${agent.cost.toFixed(4)}</Text>
          </>
        )}
      </Box>

      {/* Output lines */}
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {lines.length === 0 ? (
          <Text color={theme.dim} dimColor>
            Waiting for output…
          </Text>
        ) : (
          lines.map((line, i) => <OutputLine key={i} line={line} />)
        )}
      </Box>
    </Box>
  );
}
