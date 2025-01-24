import { marked, type Tokens } from "marked";

// Add exports for the interfaces
export interface EditorJSBlock {
  type: string;
  data: Record<string, unknown>;
}

export interface EditorJSData {
  time: number;
  blocks: EditorJSBlock[];
  version: string;
}

export function convertMarkdownToEditorJS(markdown: string): EditorJSData {
  const tokens = marked.lexer(markdown);
  const blocks: EditorJSBlock[] = [];

  // Helper function to process inline formatting
  function processInlineFormatting(text: string): string {
    return (
      text
        // Links (process first to avoid conflicts with other patterns)
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        )
        // Bold (both ** and __ syntax)
        .replace(/(\*\*|__)(.*?)\1/g, "<b>$2</b>")
        // Italic (both * and _ syntax)
        .replace(/(\*|_)(.*?)\1/g, "<i>$2</i>")
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    );
  }

  for (const token of tokens) {
    switch (token.type) {
      case "paragraph": {
        const paragraphToken = token as Tokens.Paragraph;
        blocks.push({
          type: "paragraph",
          data: {
            text: processInlineFormatting(paragraphToken.text),
          },
        });
        break;
      }

      case "heading": {
        const headingToken = token as Tokens.Heading;
        blocks.push({
          type: "header",
          data: {
            text: processInlineFormatting(headingToken.text),
            level: headingToken.depth,
          },
        });
        break;
      }

      case "list": {
        const listToken = token as Tokens.List;
        blocks.push({
          type: "list",
          data: {
            style: listToken.ordered ? "ordered" : "unordered",
            items: listToken.items.map((item: Tokens.ListItem) =>
              processInlineFormatting(item.text),
            ),
          },
        });
        break;
      }

      case "code": {
        const codeToken = token as Tokens.Code;
        blocks.push({
          type: "paragraph",
          data: {
            text: processInlineFormatting(codeToken.text),
          },
        });
        break;
      }

      case "blockquote": {
        const blockquoteToken = token as Tokens.Blockquote;
        blocks.push({
          type: "paragraph",
          data: {
            text: processInlineFormatting(blockquoteToken.text),
          },
        });
        break;
      }
    }
  }

  return {
    time: new Date().getTime(),
    blocks,
    version: "2.27.2", // Current EditorJS version
  };
}
