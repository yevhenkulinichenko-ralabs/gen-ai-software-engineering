const { v4: uuidv4 } = require('uuid');
const repository = require('../repositories/ticketsRepository');
const { createSchema } = require('../schemas/ticketSchema');
const { classify } = require('./classificationService');

class TicketsService {
  createTicket(data) {
    const { auto_classify = false, ...ticketData } = data;
    const now = new Date().toISOString();
    const ticket = {
      id: uuidv4(),
      ...ticketData,
      status: ticketData.status || 'new',
      tags: ticketData.tags || [],
      resolved_at: ticketData.resolved_at || null,
      assigned_to: ticketData.assigned_to || null,
      created_at: now,
      updated_at: now
    };
    const created = repository.create(ticket);
    if (auto_classify) {
      return this._applyClassification(created.id, created).ticket;
    }
    return created;
  }

  async importTickets(records) {
    const summary = { total_records: records.length, successful: 0, failed: [] };

    for (let i = 0; i < records.length; i++) {
      const { error, value } = createSchema.validate(records[i], { abortEarly: false });
      if (error) {
        summary.failed.push({ index: i, errors: error.details.map(d => d.message) });
      } else {
        this.createTicket(value);
        summary.successful++;
      }
    }

    return summary;
  }

  listTickets(filters) {
    return repository.findAll(filters);
  }

  getTicket(id) {
    return repository.findById(id);
  }

  autoClassifyTicket(id) {
    const ticket = repository.findById(id);
    if (!ticket) return null;
    return this._applyClassification(id, ticket);
  }

  _applyClassification(id, ticket) {
    const result = classify(ticket.subject, ticket.description);
    console.log(`[classification] ticket=${id} category=${result.category} priority=${result.priority} confidence=${result.confidence} keywords=[${result.keywords_found.join(', ')}]`);
    const updated = repository.update(id, {
      category: result.category,
      priority: result.priority,
      classification: {
        confidence: result.confidence,
        reasoning: result.reasoning,
        keywords_found: result.keywords_found,
        classified_at: new Date().toISOString()
      }
    });
    return { ticket: updated, classification: result };
  }

  updateTicket(id, data) {
    const existing = repository.findById(id);
    if (!existing) return null;
    const isOverride = ('category' in data && data.category !== existing.category) ||
                       ('priority' in data && data.priority !== existing.priority);
    if (isOverride) {
      console.log(`[classification] manual override ticket=${id} category=${data.category ?? existing.category} priority=${data.priority ?? existing.priority}`);
      data = { ...data, classification_overridden: true };
    }
    return repository.update(id, data);
  }

  deleteTicket(id) {
    return repository.remove(id);
  }
}

module.exports = new TicketsService();
