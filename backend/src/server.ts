import express from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dev-only seed endpoint
app.get('/api/seed', async (req, res) => {
  if (NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Seed endpoint is not available in production' 
    });
  }

  try {
    console.log('Running database seed...');
    const { stdout, stderr } = await execAsync('pnpm db:seed', {
      cwd: process.cwd(),
    });

    console.log(stdout);
    if (stderr) console.error(stderr);

    res.json({ 
      message: 'Database seeded successfully',
      output: stdout,
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ 
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Basic API endpoint to verify database connection
app.get('/api/pairs', async (req, res) => {
  try {
    const pairs = await prisma.pair.findMany({
      include: {
        _count: {
          select: {
            opportunities: true,
            scanStats: true,
          },
        },
      },
    });
    res.json(pairs);
  } catch (error) {
    console.error('Error fetching pairs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pairs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${NODE_ENV}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      if (NODE_ENV === 'development') {
        console.log(`✓ Seed endpoint: http://localhost:${PORT}/api/seed`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(console.error);
