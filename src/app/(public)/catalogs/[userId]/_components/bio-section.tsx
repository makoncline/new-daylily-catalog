"use client";

import { EditorOutput } from "@/components/editor/editor-output";
import { type OutputData } from "@editorjs/editorjs";

interface BioSectionProps {
  bio?: string | OutputData | null;
}

export function BioSection({ bio }: BioSectionProps) {
  if (!bio) return null;

  return (
    <div id="bio">
      <h2 className="text-2xl font-semibold">Bio</h2>
      <EditorOutput
        content={
          typeof bio === "string" ? (JSON.parse(bio) as OutputData) : bio
        }
      />
    </div>
  );
}
