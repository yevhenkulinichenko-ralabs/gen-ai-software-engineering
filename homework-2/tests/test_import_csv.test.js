const csvParser = require('../src/services/parsers/csvParser');

// Columns: customer_id, customer_email, customer_name, subject, description,
//          category, priority, status, tags, assigned_to, resolved_at,
//          metadata_source, metadata_browser, metadata_device_type  (14 total)
const HEADER = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,tags,assigned_to,resolved_at,metadata_source,metadata_browser,metadata_device_type';
const ROW = 'cust-1,user@example.com,Test User,Subject line here,This is a long enough description for the issue.,account_access,medium,new';

describe('CsvParser', () => {
  it('parses a valid CSV into an array of record objects', () => {
    // tags=empty, assigned_to=empty, resolved_at=empty, then metadata cols
    const csv = `${HEADER}\n${ROW},,,,web_form,Chrome,desktop`;
    const result = csvParser.parse(csv);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBe('cust-1');
    expect(result[0].customer_email).toBe('user@example.com');
  });

  it('splits pipe-delimited tags into an array', () => {
    const csv = `${HEADER}\n${ROW},tag1|tag2|tag3,,,web_form,,desktop`;
    const result = csvParser.parse(csv);
    expect(result[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('normalises metadata_* columns into a nested metadata object', () => {
    const csv = `${HEADER}\n${ROW},,,,web_form,Chrome,desktop`;
    const result = csvParser.parse(csv);
    expect(result[0].metadata).toBeDefined();
    expect(result[0].metadata.source).toBe('web_form');
    expect(result[0].metadata.browser).toBe('Chrome');
    expect(result[0].metadata.device_type).toBe('desktop');
    expect(result[0].metadata_source).toBeUndefined();
    expect(result[0].metadata_browser).toBeUndefined();
    expect(result[0].metadata_device_type).toBeUndefined();
  });

  it('converts empty assigned_to string to null', () => {
    const csv = `${HEADER}\n${ROW},,,,web_form,,desktop`;
    const result = csvParser.parse(csv);
    expect(result[0].assigned_to).toBeNull();
  });

  it('converts empty resolved_at string to null', () => {
    const csv = `${HEADER}\n${ROW},,,,web_form,,desktop`;
    const result = csvParser.parse(csv);
    expect(result[0].resolved_at).toBeNull();
  });

  it('returns empty array for CSV with only headers and no data rows', () => {
    const result = csvParser.parse(HEADER);
    expect(result).toEqual([]);
  });
});
