const Joi = require('joi');

const CATEGORIES = ['account_access', 'technical_issue', 'billing_question', 'feature_request', 'bug_report', 'other'];
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const STATUSES = ['new', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
const SOURCES = ['web_form', 'email', 'api', 'chat', 'phone'];
const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'];

const metadataSchema = Joi.object({
  source: Joi.string().valid(...SOURCES).required(),
  browser: Joi.string().allow('', null).optional(),
  device_type: Joi.string().valid(...DEVICE_TYPES).required()
});

const createSchema = Joi.object({
  customer_id: Joi.string().required(),
  customer_email: Joi.string().email().required(),
  customer_name: Joi.string().required(),
  subject: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  auto_classify: Joi.boolean().default(false),
  category: Joi.when('auto_classify', {
    is: true,
    then: Joi.valid(null).optional().default(null),
    otherwise: Joi.string().valid(...CATEGORIES).required()
  }),
  priority: Joi.when('auto_classify', {
    is: true,
    then: Joi.valid(null).optional().default(null),
    otherwise: Joi.string().valid(...PRIORITIES).required()
  }),
  status: Joi.string().valid(...STATUSES).default('new'),
  resolved_at: Joi.string().isoDate().allow(null).optional(),
  assigned_to: Joi.string().allow(null, '').optional(),
  tags: Joi.array().items(Joi.string()).default([]),
  metadata: metadataSchema.required()
});

const updateSchema = Joi.object({
  customer_id: Joi.string(),
  customer_email: Joi.string().email(),
  customer_name: Joi.string(),
  subject: Joi.string().min(1).max(200),
  description: Joi.string().min(10).max(2000),
  category: Joi.string().valid(...CATEGORIES),
  priority: Joi.string().valid(...PRIORITIES),
  status: Joi.string().valid(...STATUSES),
  resolved_at: Joi.string().isoDate().allow(null),
  assigned_to: Joi.string().allow(null, ''),
  tags: Joi.array().items(Joi.string()),
  metadata: Joi.object({
    source: Joi.string().valid(...SOURCES),
    browser: Joi.string().allow('', null),
    device_type: Joi.string().valid(...DEVICE_TYPES)
  })
}).min(1);

module.exports = { createSchema, updateSchema, CATEGORIES, PRIORITIES, STATUSES };
