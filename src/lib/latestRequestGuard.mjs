export function createLatestRequestGuard() {
  let generation = 0;

  return {
    begin() {
      const requestGeneration = ++generation;
      return {
        isCurrent: () => requestGeneration === generation,
      };
    },
    invalidate() {
      generation += 1;
    },
  };
}
