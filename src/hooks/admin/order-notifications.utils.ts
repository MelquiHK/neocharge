export interface OrderLike {
  id?: string;
  status?: string;
}

export function getUnseenOrders(existingIds: Set<string>, orders: OrderLike[]) {
  return orders.filter((order) => Boolean(order.id) && !existingIds.has(order.id));
}
