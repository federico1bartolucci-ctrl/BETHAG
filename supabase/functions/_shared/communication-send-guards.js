export function isCommunicationPublished(published) {
  return published === true;
}

export function canSendCommunication(role, permissions) {
  if (role === "admin") return true;
  if (role !== "collaborator") return false;
  if (Array.isArray(permissions)) return permissions.includes("comunicazioni");
  return Boolean(
    permissions &&
    typeof permissions === "object" &&
    permissions.comunicazioni === true
  );
}
