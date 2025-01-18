declare module "@editorjs/editorjs" {
  export interface OutputData {
    time: number;
    blocks: {
      id: string;
      type: string;
      data: Record<string, any>;
    }[];
    version: string;
  }

  export interface BlockToolData {
    text?: string;
    level?: number;
    style?: string;
    items?: string[];
    link?: string;
  }

  export interface BlockTool {
    save(block: HTMLElement): Promise<BlockToolData> | BlockToolData;
    render(): HTMLElement;
  }

  export interface BlockToolConstructable {
    new (...args: any[]): BlockTool;
  }

  export type ToolConstructable = BlockToolConstructable;

  export default class EditorJS {
    constructor(options: any);
    destroy(): Promise<void>;
    save(): Promise<OutputData>;
  }
}

declare module "@editorjs/header" {
  import { BlockTool, BlockToolData } from "@editorjs/editorjs";

  export interface HeaderData extends BlockToolData {
    text: string;
    level: number;
  }

  export default class Header implements BlockTool {
    constructor(data: any);
    save(block: HTMLElement): Promise<HeaderData> | HeaderData;
    render(): HTMLElement;
  }
}

declare module "@editorjs/list" {
  import { BlockTool, BlockToolData } from "@editorjs/editorjs";

  export interface ListData extends BlockToolData {
    style: "ordered" | "unordered";
    items: string[];
  }

  export default class List implements BlockTool {
    constructor(data: any);
    save(block: HTMLElement): Promise<ListData> | ListData;
    render(): HTMLElement;
  }
}

declare module "@editorjs/link" {
  import { BlockTool, BlockToolData } from "@editorjs/editorjs";

  export interface LinkData extends BlockToolData {
    link: string;
    meta?: {
      title?: string;
      description?: string;
      image?: {
        url: string;
      };
    };
  }

  export default class Link implements BlockTool {
    constructor(data: any);
    save(block: HTMLElement): Promise<LinkData> | LinkData;
    render(): HTMLElement;
  }
}

declare module "@editorjs/inline-code" {
  import { BlockTool, BlockToolData } from "@editorjs/editorjs";

  export interface InlineCodeData extends BlockToolData {
    text: string;
  }

  export default class InlineCode implements BlockTool {
    constructor(data: any);
    save(block: HTMLElement): Promise<InlineCodeData> | InlineCodeData;
    render(): HTMLElement;
  }
}
