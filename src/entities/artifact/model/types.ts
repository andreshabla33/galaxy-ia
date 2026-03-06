export type ArtifactType = 'document' | 'image' | 'code' | 'presentation'

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
