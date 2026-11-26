export async function findAuthUserByEmail(adminClient, email) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("An email address is required for Auth-user lookup.");

  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (!Array.isArray(data?.users)) {
      throw new Error("Supabase Auth returned an invalid user-directory page.");
    }

    const existingUser = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail
    );
    if (existingUser) return existingUser;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}
