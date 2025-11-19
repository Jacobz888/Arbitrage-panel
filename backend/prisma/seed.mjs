import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.opportunity.deleteMany();
  await prisma.scanStats.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.pair.deleteMany();

  // Create pairs
  const manaPair = await prisma.pair.create({
    data: {
      symbol: 'MANA/USDT',
      baseAsset: 'MANA',
      quoteAsset: 'USDT',
      isActive: true,
    },
  });

  const apePair = await prisma.pair.create({
    data: {
      symbol: 'APE/USDT',
      baseAsset: 'APE',
      quoteAsset: 'USDT',
      isActive: true,
    },
  });

  console.log('✓ Created pairs:', manaPair.symbol, apePair.symbol);

  // Create opportunities for MANA/USDT
  const manaOpportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        pairId: manaPair.id,
        buyExchange: 'Gate.io',
        sellExchange: 'KyberSwap',
        buyPrice: '0.4520000000',
        sellPrice: '0.4650000000',
        spread: '2.876106',
        profitEstimate: '130.0000000000',
        volume: '10000.0000000000',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      },
    }),
    prisma.opportunity.create({
      data: {
        pairId: manaPair.id,
        buyExchange: 'KyberSwap',
        sellExchange: 'Gate.io',
        buyPrice: '0.4480000000',
        sellPrice: '0.4590000000',
        spread: '2.455357',
        profitEstimate: '110.0000000000',
        volume: '8500.0000000000',
        status: 'EXECUTED',
        executedAt: new Date(Date.now() - 7200000), // 2 hours ago
        expiresAt: new Date(Date.now() - 3600000),
      },
    }),
  ]);

  console.log(`✓ Created ${manaOpportunities.length} opportunities for MANA/USDT`);

  // Create opportunities for APE/USDT
  const apeOpportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        pairId: apePair.id,
        buyExchange: 'Gate.io',
        sellExchange: 'KyberSwap',
        buyPrice: '1.2340000000',
        sellPrice: '1.2720000000',
        spread: '3.079481',
        profitEstimate: '380.0000000000',
        volume: '12000.0000000000',
        status: 'PENDING',
      },
    }),
    prisma.opportunity.create({
      data: {
        pairId: apePair.id,
        buyExchange: 'KyberSwap',
        sellExchange: 'Gate.io',
        buyPrice: '1.2280000000',
        sellPrice: '1.2550000000',
        spread: '2.199022',
        profitEstimate: '270.0000000000',
        volume: '9500.0000000000',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 5400000), // 1.5 hours from now
      },
    }),
    prisma.opportunity.create({
      data: {
        pairId: apePair.id,
        buyExchange: 'Gate.io',
        sellExchange: 'KyberSwap',
        buyPrice: '1.2150000000',
        sellPrice: '1.2350000000',
        spread: '1.646091',
        profitEstimate: '200.0000000000',
        volume: '7000.0000000000',
        status: 'FAILED',
        executedAt: new Date(Date.now() - 10800000), // 3 hours ago
      },
    }),
  ]);

  console.log(`✓ Created ${apeOpportunities.length} opportunities for APE/USDT`);

  // Create scan stats
  const manaStats = await prisma.scanStats.create({
    data: {
      pairId: manaPair.id,
      totalScans: 248,
      successfulScans: 236,
      failedScans: 12,
      opportunitiesFound: 47,
      lastScanAt: new Date(),
      averageScanTime: '1.85',
      minPrice: '0.4250000000',
      maxPrice: '0.4850000000',
      avgPrice: '0.4550000000',
    },
  });

  const apeStats = await prisma.scanStats.create({
    data: {
      pairId: apePair.id,
      totalScans: 315,
      successfulScans: 298,
      failedScans: 17,
      opportunitiesFound: 62,
      lastScanAt: new Date(),
      averageScanTime: '2.12',
      minPrice: '1.1850000000',
      maxPrice: '1.3200000000',
      avgPrice: '1.2475000000',
    },
  });

  console.log('✓ Created scan stats for both pairs');

  // Create settings
  const settings = await Promise.all([
    prisma.settings.create({
      data: {
        key: 'MIN_SPREAD_THRESHOLD',
        value: '1.5',
        description: 'Minimum spread percentage to consider an opportunity',
        minSpread: '1.500000',
        isActive: true,
      },
    }),
    prisma.settings.create({
      data: {
        key: 'MAX_INVESTMENT_PER_TRADE',
        value: '10000',
        description: 'Maximum investment amount per single trade in USDT',
        maxInvestment: '10000.0000000000',
        isActive: true,
      },
    }),
    prisma.settings.create({
      data: {
        key: 'SCAN_INTERVAL',
        value: '60',
        description: 'Interval between price scans in seconds',
        scanInterval: 60,
        isActive: true,
      },
    }),
    prisma.settings.create({
      data: {
        key: 'MAX_SLIPPAGE',
        value: '0.5',
        description: 'Maximum acceptable slippage percentage',
        minSpread: '0.500000',
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ Created ${settings.length} settings`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
