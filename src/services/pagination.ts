/** PostgREST caps responses. Fetch every page so long-lived habit history is never truncated. */
export async function readAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const size = 500;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const result = await page(from, from + size - 1);
    if (result.error) throw result.error;
    const next = result.data ?? [];
    rows.push(...next);
    if (next.length < size) return rows;
  }
}
