const xml2js = require('xml2js');

class XmlParser {
  async parse(body) {
    let result;
    try {
      result = await xml2js.parseStringPromise(body, { explicitArray: false, trim: true });
    } catch (e) {
      throw new Error(`XML parse error: ${e.message}`);
    }

    if (!result || !result.tickets || !result.tickets.ticket) {
      throw new Error('XML must have a root <tickets> element containing <ticket> children');
    }

    const raw = result.tickets.ticket;
    const items = Array.isArray(raw) ? raw : [raw];

    return items.map(t => {
      const ticket = { ...t };

      if (ticket.tags) {
        if (typeof ticket.tags === 'object' && ticket.tags.tag) {
          ticket.tags = Array.isArray(ticket.tags.tag) ? ticket.tags.tag : [ticket.tags.tag];
        } else if (typeof ticket.tags === 'string') {
          ticket.tags = ticket.tags.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          ticket.tags = [];
        }
      } else {
        ticket.tags = [];
      }

      if (ticket.metadata && typeof ticket.metadata === 'object') {
        ticket.metadata = {
          source: ticket.metadata.source || undefined,
          browser: ticket.metadata.browser || null,
          device_type: ticket.metadata.device_type || undefined
        };
      }

      if (ticket.assigned_to === '') ticket.assigned_to = null;
      if (ticket.resolved_at === '') ticket.resolved_at = null;

      return ticket;
    });
  }
}

module.exports = new XmlParser();
