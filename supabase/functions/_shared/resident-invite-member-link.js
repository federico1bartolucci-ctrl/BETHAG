function matchSnapshotField(query, column, value) {
  return value === null || value === undefined
    ? query.is(column, null)
    : query.eq(column, value);
}

/**
 * Atomically links the Auth user only if the resident record still matches
 * the snapshot used to prepare the invitation and portal permissions.
 */
export async function linkResidentMemberIfUnchanged(adminClient, member, targetUserId) {
  let query = adminClient
    .from("condominium_members")
    .update({ user_id: targetUserId })
    .eq("id", member.id)
    .eq("condominium_id", member.condominium_id)
    .eq("legacy_id", member.legacy_id)
    .eq("active", true);

  query = matchSnapshotField(query, "email", member.email);
  query = matchSnapshotField(query, "name", member.name);
  query = matchSnapshotField(query, "unit_id", member.unit_id);
  query = matchSnapshotField(query, "data->>role", member.data?.role);
  query = matchSnapshotField(query, "data->>apartment", member.data?.apartment);
  query = matchSnapshotField(query, "data->>unitCode", member.data?.unitCode);

  if (member.user_id) {
    query = query.eq("user_id", member.user_id);
  } else {
    query = query.is("user_id", null);
  }

  const { data, error } = await query.select("id");
  if (error) throw error;
  return data || [];
}
