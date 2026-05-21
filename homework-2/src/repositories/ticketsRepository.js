class TicketsRepository {
  constructor() {
    this.tickets = new Map();
  }

  create(ticket) {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  findAll(filters = {}) {
    let result = Array.from(this.tickets.values());
    for (const key of ['status', 'category', 'priority', 'customer_id', 'assigned_to']) {
      if (filters[key] !== undefined) {
        result = result.filter(t => t[key] === filters[key]);
      }
    }
    return result;
  }

  findById(id) {
    return this.tickets.get(id) || null;
  }

  update(id, data) {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;
    const updated = { ...ticket, ...data, id, updated_at: new Date().toISOString() };
    this.tickets.set(id, updated);
    return updated;
  }

  remove(id) {
    if (!this.tickets.has(id)) return false;
    this.tickets.delete(id);
    return true;
  }

  clear() {
    this.tickets.clear();
  }
}

module.exports = new TicketsRepository();
