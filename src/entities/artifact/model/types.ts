// Canonical ArtifactType — matches the values used by prompt-loader, artifact-parser,
// artifact-prompts, edit-prompts, and all viewers/exporters across the system.
export type ArtifactType = 'documento' | 'presentacion' | 'codigo' | 'imagen'

export interface Artifact {
  id: string;
  type: ArtifactType;
  titulo: string;
  contenido: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
