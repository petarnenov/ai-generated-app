import express from 'express';
import axios from 'axios';
import { db } from '../database/init.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get AI configuration
router.get('/config', asyncHandler(async (req, res) => {
  db.all(
    'SELECT key, value FROM settings WHERE key LIKE "%api_key" OR key LIKE "review_%"',
    (err, rows) => {
      if (err) {
        throw createError(500, 'Failed to fetch AI configuration');
      }
      
      const config = rows.reduce((acc: Record<string, any>, row: any) => {
        if (row.key.includes('api_key')) {
          acc[row.key] = row.value ? '***' : '';
        } else {
          acc[row.key] = row.value;
        }
        return acc;
      }, {});
      
      res.json(config);
    }
  );
}));

// Update AI configuration
router.post('/config', asyncHandler(async (req, res) => {
  const {
    openai_api_key,
    anthropic_api_key,
    review_auto_post,
    review_min_score,
    review_max_files,
    review_max_lines
  } = req.body;
  
  const updates = [
    { key: 'openai_api_key', value: (openai_api_key === null || openai_api_key === undefined) ? '' : openai_api_key },
    { key: 'anthropic_api_key', value: (anthropic_api_key === null || anthropic_api_key === undefined) ? '' : anthropic_api_key },
    { key: 'review_auto_post', value: (review_auto_post === null || review_auto_post === undefined) ? 'false' : String(review_auto_post) },
    { key: 'review_min_score', value: (review_min_score === null || review_min_score === undefined) ? '0' : String(review_min_score) },
    { key: 'review_max_files', value: (review_max_files === null || review_max_files === undefined) ? '10' : String(review_max_files) },
    { key: 'review_max_lines', value: (review_max_lines === null || review_max_lines === undefined) ? '500' : String(review_max_lines) }
  ];
  
  const updatePromises = updates.map(({ key, value }) => 
    new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, value],
        (err) => err ? reject(err) : resolve(null)
      );
    })
  );
  
  await Promise.all(updatePromises);
  
  res.json({ message: 'AI configuration updated successfully' });
}));

// Test AI provider connection
router.post('/test', asyncHandler(async (req, res) => {
  const { provider, api_key } = req.body;
  
  if (!provider || !api_key) {
    throw createError(400, 'Provider and API key are required');
  }
  
  try {
    let response;
    
    if (provider === 'openai') {
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello, this is a test.' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else if (provider === 'anthropic') {
      response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello, this is a test.' }]
        },
        {
          headers: {
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      throw createError(400, 'Unsupported provider');
    }
    
    res.json({
      success: true,
      message: `${provider} API connection successful`,
      model: response.data.model || 'unknown'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: `${provider} API connection failed: ${error.response?.data?.error?.message || error.message}`
    });
  }
}));

// Get available AI models
router.get('/models', asyncHandler(async (req, res) => {
  res.json({
    openai: [
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex code reviews' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and cheaper than GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Good performance, cost-effective' }
    ],
    anthropic: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable Claude model' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and cost' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest and most cost-effective' }
    ]
  });
}));

// Get review templates
router.get('/templates', asyncHandler(async (req, res) => {
  res.json([
    {
      id: 'general',
      name: 'General Code Review',
      description: 'Comprehensive code review covering best practices, readability, and maintainability',
      prompt: `Please review this code change and provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security implications
5. Readability and maintainability
6. Test coverage suggestions

Please be constructive and provide specific suggestions for improvement.`
    },
    {
      id: 'security',
      name: 'Security Review',
      description: 'Focused on security vulnerabilities and best practices',
      prompt: `Please perform a security-focused review of this code change. Look for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Authentication/authorization issues
4. Input validation problems
5. Sensitive data exposure
6. Cryptographic issues
7. API security concerns

Rate the security risk and provide specific remediation steps.`
    },
    {
      id: 'performance',
      name: 'Performance Review',
      description: 'Focused on performance optimization and efficiency',
      prompt: `Please review this code change for performance implications:
1. Algorithm efficiency
2. Memory usage
3. Database query optimization
4. Caching opportunities
5. Network request optimization
6. Resource utilization
7. Scalability concerns

Provide specific performance improvement suggestions.`
    },
    {
      id: 'testing',
      name: 'Test Review',
      description: 'Focused on test quality and coverage',
      prompt: `Please review the test coverage and quality:
1. Test completeness and coverage
2. Test case design
3. Edge case handling
4. Integration test needs
5. Performance test requirements
6. Test maintainability
7. Mock usage appropriateness

Suggest additional tests that should be written.`
    }
  ]);
}));

export default router;
