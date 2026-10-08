export interface OrderLike {
  id?: string;
  status?: string;
}

export function getUnseenRecords(existingIds: Set<string>, records: OrderLike[]) {
  return records.filter((record) => Boolean(record.id) && !existingIds.has(record.id));
}

/**
 * ¿El registro merece una notificación? Solo si es más nuevo que todo lo
 * que ya conocíamos. Sin este filtro, la carga inicial (15) + el poll (25)
 * hacían "revivir" pedidos viejos como si fueran nuevos.
 */
export function isGenuinelyNew(createdAt: string | null | undefined, maxKnownTime: number): boolean {
  const t = createdAt ? new Date(createdAt).getTime() : NaN;
  return Number.isFinite(t) && (t as number) > maxKnownTime;
}
