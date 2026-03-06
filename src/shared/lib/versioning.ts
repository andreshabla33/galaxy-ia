import { supabase } from './supabase'

/**
 * Guarda una nueva versión de un artefacto.
 */
export async function saveArtifactVersion(
  artefactoId: string,
  version: number,
  contenido: Record<string, unknown>,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.from('artifact_versions').insert({
    artefacto_id: artefactoId,
    version,
    contenido,
    metadata,
  })

  if (error) {
    console.error('Error saving version:', error.message)
    return false
  }
  return true
}

/**
 * Obtiene todas las versiones de un artefacto.
 */
export async function getArtifactVersions(artefactoId: string) {
  const { data, error } = await supabase
    .from('artifact_versions')
    .select('id, version, contenido, metadata, created_at')
    .eq('artefacto_id', artefactoId)
    .order('version', { ascending: false })

  if (error) {
    console.error('Error fetching versions:', error.message)
    return []
  }
  return data || []
}

/**
 * Incrementa la versión del artefacto principal y guarda snapshot.
 */
export async function incrementArtifactVersion(
  artefactoId: string,
  newContenido: Record<string, unknown>,
  metadata: Record<string, unknown> = {}
) {
  // Obtener versión actual
  const { data: artifact, error: fetchErr } = await supabase
    .from('artefactos')
    .select('version, contenido')
    .eq('id', artefactoId)
    .single()

  if (fetchErr || !artifact) {
    console.error('Error fetching artifact for versioning:', fetchErr?.message)
    return
  }

  const currentVersion = artifact.version || 1
  const newVersion = currentVersion + 1

  // Guardar versión anterior como snapshot
  await saveArtifactVersion(artefactoId, currentVersion, artifact.contenido, metadata)

  // Actualizar artefacto principal
  const { error: updateErr } = await supabase
    .from('artefactos')
    .update({
      contenido: newContenido,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', artefactoId)

  if (updateErr) {
    console.error('Error updating artifact version:', updateErr.message)
  }

  return newVersion
}
