          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || cancelled) return;

        const workspaceId = await getActiveWorkspaceId(session.user.id);
        if (!workspaceId || cancelled) return;

        const backend = await loadBackendState(workspaceId);
        if (cancelled) return;

        setCondominiums(backend.condominiums);
        setCondominiumMembers(backend.condominiumMembers);
        setDocuments(backend.documents);
        setDeadlines(backend.deadlines);
        setAssemblies(backend.assemblies);
        setSuppliers(backend.suppliers);
        setActivities(backend.activities);
        setCommunications(backend.communications);
        setCondominiumRequests(backend.condominiumRequests);
        backendHydrated.current = true;

        setProfile((current) => ({
          ...current,
          workspaceId,
          email: session.user.email || current.email,
        }));
      } catch (error) {
        console.error("BETHAG backend hydration failed", error);
      }
    };

    void hydrateFromBackend();

    return () => {
      cancelled = true;
    };
  }, [sessionRole]);

  useEffect(() => {
    if (
      !supabaseConfigured ||
      !supabase ||
      !sessionRole ||
      !profile.workspaceId ||
      !backendHydrated.current
    ) return;

    const timer = window.setTimeout(() => {
      void syncBackendState(profile.workspaceId, {
        condominiums,
        condominiumMembers,
        documents,
        deadlines,
        assemblies,
        suppliers,
        activities,