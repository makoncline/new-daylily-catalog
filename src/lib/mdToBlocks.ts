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

  for (const token of tokens) {
    switch (token.type) {
      case "paragraph": {
        const paragraphToken = token as Tokens.Paragraph;
        blocks.push({
          type: "paragraph",
          data: {
            text: paragraphToken.text,
          },
        });
        break;
      }

      case "heading": {
        const headingToken = token as Tokens.Heading;
        blocks.push({
          type: "header",
          data: {
            text: headingToken.text,
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
            items: listToken.items.map((item: Tokens.ListItem) => item.text),
          },
        });
        break;
      }

      case "code": {
        const codeToken = token as Tokens.Code;
        blocks.push({
          type: "code",
          data: {
            code: codeToken.text,
          },
        });
        break;
      }

      case "blockquote": {
        const blockquoteToken = token as Tokens.Blockquote;
        blocks.push({
          type: "paragraph",
          data: {
            text: blockquoteToken.text,
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
