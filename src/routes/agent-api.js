import express from 'express';

const router = express.Router();
const ORDER_REPORTER_API_URL = process.env.ORDER_REPORTER_API_URL || 'http://127.0.0.1:8002';
const CAKE_RECOMMENDER_API_URL = process.env.CAKE_RECOMMENDER_API_URL || 'http://127.0.0.1:8003';

// GET /api/agent/report/weekly - Get weekly order report
router.post('/report/weekly', async (req, res) => {
  try {
    const { reference_date, locale = 'en', database_url } = req.body;

    const response = await fetch(`${ORDER_REPORTER_API_URL}/report`, {
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

// GET /api/agent/health - Check if agents are running
router.get('/health', async (req, res) => {
  try {
    const orderResponse = await fetch(`${ORDER_REPORTER_API_URL}/health`, {
      timeout: 5000
    });
    const orderData = await orderResponse.json();
    const orderRunning = orderResponse.ok;

    let cakeRunning = false;
    let cakeStatus = 'unreachable';
    try {
      const cakeResponse = await fetch(`${CAKE_RECOMMENDER_API_URL}/health`, {
        timeout: 5000
      });
      const cakeData = await cakeResponse.json();
      cakeRunning = cakeResponse.ok;
      cakeStatus = cakeData.status || 'unknown';
    } catch (error) {
      cakeStatus = 'unreachable';
    }

    res.json({
      order_reporter_running: orderRunning,
      order_reporter_status: orderData.status || 'unknown',
      cake_recommender_running: cakeRunning,
      cake_recommender_status: cakeStatus
    });
  } catch (error) {
    res.json({
      order_reporter_running: false,
      order_reporter_status: 'unreachable',
      cake_recommender_running: false,
      cake_recommender_status: 'unreachable',
      message: 'Unable to check agent status'
    });
  }
});

// POST /api/agent/recommend - Get cake recommendations
router.post('/recommend', async (req, res) => {
  try {
    const { dietary_restriction, serves } = req.body;

    const response = await fetch(`${CAKE_RECOMMENDER_API_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dietary_restriction,
        serves
      }),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`Recommender API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling cake recommender agent:', error);
    res.status(503).json({
      status: 'error',
      error: 'Cake recommender agent is unavailable. Make sure it is running on port 8003.',
      detail: error.message
    });
  }
});

// GET /api/agent/cakes - List all available cakes
router.get('/cakes', async (req, res) => {
  try {
    const response = await fetch(`${CAKE_RECOMMENDER_API_URL}/cakes`, {
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`Recommender API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling cake recommender agent:', error);
    res.status(503).json({
      status: 'error',
      error: 'Cake recommender agent is unavailable. Make sure it is running on port 8003.',
      detail: error.message
    });
  }
});

export default router;
