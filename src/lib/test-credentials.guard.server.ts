/** Owner-only gate for QA credential management. */
export async function assertOwner(supabase: {
  rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
}) {
  const { data: isOwner } = await supabase.rpc("ss_is_owner");
  if (!isOwner) throw new Error("Owner access required to manage test credentials");
}
