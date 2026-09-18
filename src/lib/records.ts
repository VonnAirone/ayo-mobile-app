/** Read every page, respecting the API's default row cap. A failure rejects the
 * whole result so reports cannot silently present partial totals. */
export async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, limit = Infinity): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, Math.min(from + 499, limit - 1));
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    rows.push(...data);
    if (data.length < 500 || rows.length >= limit) return rows;
  }
}
