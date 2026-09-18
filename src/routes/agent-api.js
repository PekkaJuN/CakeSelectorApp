import express from 'express';

const router = express.Router();
const AGENT_API_URL = process.env.ORDER_REPORTER_API_URL || 'http://127.0.0.1:8002';

// GET /api/agent/report/weekly - Get weekly order report
router.post('/report/weekly', async (req, res) => {
  try {
    const { reference_date, locale = 'en', database_url } = req.body;

    const response = await fetch(`${AGENT_API_URL}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_date,
        locale,
        database_url
      }),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`Agent API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling order reporter agent:', error);
    res.status(503).json({
      status: 'error',
      error: 'Order reporter agent is unavailable. Make sure it is running on port 8002.',
      detail: error.message
    });
  }
});

// GET /api/agent/health - Check if agent is running
router.get('/health', async (req, res) => {
  try {
    const response = await fetch(`${AGENT_API_URL}/health`, {
      timeout: 5000
    });
    const data = await response.json();
    res.json({
      agent_running: response.ok,
      agent_status: data.status || 'unknown'
    });
  } catch (error) {
    res.json({
      agent_running: false,
      agent_status: 'unreachable',
      message: 'Order reporter agent is not running'
    });
  }
});

export default router;
