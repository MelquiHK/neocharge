export interface OrderLike {
  id?: string;
  status?: string;
}

export function getUnseenRecords(existingIds: Set<string>, records: OrderLike[]) {
  return records.filter((record) => Boolean(record.id) && !existingIds.has(record.id));
}
