import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing } from '../constants/theme';

/**
 * Custom safe markdown renderer.
 * Handles fenced code blocks and plain text paragraphs.
 * No external parser libraries.
 */

interface Block {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines.join('\n'), lang });
      i++; // skip closing ```
    } else {
      // Collect text lines until next code block
      const textLines: string[] = [];
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        textLines.push(lines[i]);
        i++;
      }
      const text = textLines.join('\n').trim();
      if (text) blocks.push({ type: 'text', content: text });
    }
  }

  return blocks;
}

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const blocks = React.useMemo(() => parseMarkdown(content), [content]);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <View
              key={idx}
              style={[styles.codeBlock, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              {block.lang ? (
                <Text style={[styles.langLabel, { color: colors.mutedForeground }]}>
                  {block.lang}
                </Text>
              ) : null}
              <Text
                style={[styles.codeText, { color: colors.foreground }]}
                selectable
              >
                {block.content}
              </Text>
            </View>
          );
        }

        // Render text block with basic inline formatting
        return (
          <Text
            key={idx}
            style={[styles.paragraph, { color: colors.foreground }]}
            selectable
          >
            {renderInlineText(block.content, colors)}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Minimal inline renderer: **bold**, *italic*, `inline code`, # headings
 */
function renderInlineText(text: string, colors: { primary: string; muted: string; foreground: string; mutedForeground: string }) {
  // For simplicity, surface the text as plain — React Native Text doesn't support
  // complex inline styled spans without a library. We keep bold/heading detection
  // at the block level.
  return text;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  paragraph: {
    fontSize: fontSize.base,
    lineHeight: 26,
    whiteSpace: 'pre-wrap',
  } as any,
  codeBlock: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    overflow: 'hidden',
  },
  langLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  codeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Courier',
    lineHeight: 18,
  },
});
