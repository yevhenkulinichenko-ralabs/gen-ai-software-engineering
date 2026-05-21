const { parse } = require('csv-parse/sync');

class CsvParser {
  parse(body) {
    let records;
    try {
      records = parse(body, { columns: true, skip_empty_lines: true, trim: true });
    } catch (e) {
      throw new Error(`CSV parse error: ${e.message}`);
    }

    return records.map(record => {
      if (typeof record.tags === 'string') {
        record.tags = record.tags ? record.tags.split('|').map(t => t.trim()).filter(Boolean) : [];
      }

      if (record.metadata_source !== undefined || record.metadata_device_type !== undefined) {
        record.metadata = {
          source: record.metadata_source || undefined,
          browser: record.metadata_browser || null,
          device_type: record.metadata_device_type || undefined
        };
        delete record.metadata_source;
        delete record.metadata_browser;
        delete record.metadata_device_type;
      }

      if (record.assigned_to === '') record.assigned_to = null;
      if (record.resolved_at === '') record.resolved_at = null;

      return record;
    });
  }
}

module.exports = new CsvParser();
