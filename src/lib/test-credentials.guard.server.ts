/** Owner-only gate for QA credential management. */
export async function assertOwner(supabase: any) {
  const { data: isOwner } = await supabase.rpc("ss_is_owner");
  if (!isOwner) throw new Error("Owner access required to manage test credentials");
}
