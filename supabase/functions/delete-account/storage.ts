type Bucket = {
  list: (prefix: string, options: { limit: number }) => Promise<{ data: { name: string; id?: string | null }[] | null; error: unknown }>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
};

/** Remove every page and nested folder, failing before account deletion if storage fails. */
export async function removeArtifacts(bucket: Bucket, prefix: string): Promise<void> {
  for (;;) {
    const { data: files, error } = await bucket.list(prefix, { limit: 100 });
    if (error) throw error;
    if (!files?.length) return;
    const objects: string[] = [];
    for (const file of files) {
      const path = `${prefix}/${file.name}`;
      if (file.id) objects.push(path);
      else await removeArtifacts(bucket, path);
    }
    if (objects.length) {
      const { error: removeError } = await bucket.remove(objects);
      if (removeError) throw removeError;
    }
  }
}
