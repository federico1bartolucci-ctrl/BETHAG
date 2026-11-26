export function buildCollaboratorInviteFailureState({
  failureStage,
  invited,
  profileCreated,
  workspaceMemberLinked,
}) {
  const invitationSent = invited === true;
  const profileWasCreated = profileCreated === true;
  const membershipWasLinked = workspaceMemberLinked === true;

  return {
    failureStage: typeof failureStage === "string" && failureStage.length > 0
      ? failureStage
      : "unknown",
    invitationSent,
    profileCreated: profileWasCreated,
    workspaceMemberLinked: membershipWasLinked,
    requiresReconciliation: invitationSent || profileWasCreated || membershipWasLinked,
  };
}
