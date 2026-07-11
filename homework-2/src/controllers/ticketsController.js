const ticketService = require('../services/ticketsService');
const parserStrategy = require('../services/parsers/parserStrategy');

class TicketsController {
  async createTicket(req, res) {
    const ticket = ticketService.createTicket(req.validatedBody);
    res.status(201).json(ticket);
  }

  async importTickets(req, res) {
    const contentType = req.get('Content-Type') || '';
    let records;
    try {
      records = await parserStrategy.parse(contentType, req.body);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const summary = await ticketService.importTickets(records);
    res.status(201).json(summary);
  }

  listTickets(req, res) {
    const filters = {};
    for (const key of ['status', 'category', 'priority', 'customer_id', 'assigned_to']) {
      if (req.query[key]) filters[key] = req.query[key];
    }
    res.json(ticketService.listTickets(filters));
  }

  getTicket(req, res) {
    const ticket = ticketService.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  }

  async updateTicket(req, res) {
    const updated = ticketService.updateTicket(req.params.id, req.validatedBody);
    if (!updated) return res.status(404).json({ error: 'Ticket not found' });
    res.json(updated);
  }

  deleteTicket(req, res) {
    const deleted = ticketService.deleteTicket(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Ticket not found' });
    res.status(204).send();
  }

  autoClassify(req, res) {
    const result = ticketService.autoClassifyTicket(req.params.id);
    if (!result) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.classification);
  }
}

module.exports = new TicketsController();
