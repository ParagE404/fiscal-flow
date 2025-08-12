const { PrismaClient } = require("@prisma/client");
const { calculateStockPnL } = require("../utils/calculations");
const {
  formatIndianCurrency,
  formatPercentage,
  formatPnL,
} = require("../utils/formatting");

const prisma = new PrismaClient();

/**
 * Get all stocks with summary calculations
 */
const getAllStocks = async (req, res, next) => {
  try {
    // Ensure default user exists

    const stocks = await prisma.stock.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary
    const totalInvestment = stocks.reduce(
      (sum, stock) => sum + stock.investedAmount,
      0
    );
    const totalCurrentValue = stocks.reduce(
      (sum, stock) => sum + stock.currentValue,
      0
    );
    const totalPnL = totalCurrentValue - totalInvestment;
    const totalPnLPercentage =
      totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

    // Calculate SIP investment (stocks with regular purchases - simplified for MVP)
    const sipInvestment = 0; // Placeholder for future SIP stock feature

    // Count by market cap
    const largeCapCount = stocks.filter(
      (stock) => stock.marketCap === "Large Cap"
    ).length;
    const midCapCount = stocks.filter(
      (stock) => stock.marketCap === "Mid Cap"
    ).length;
    const smallCapCount = stocks.filter(
      (stock) => stock.marketCap === "Small Cap"
    ).length;

    // Count profitable vs loss-making stocks
    const profitableStocks = stocks.filter((stock) => stock.pnl > 0).length;
    const lossStocks = stocks.filter((stock) => stock.pnl < 0).length;

    const summary = {
      totalInvestment,
      totalCurrentValue,
      totalPnL,
      totalPnLPercentage,
      sipInvestment,
      totalStocks: stocks.length,
      largeCapCount,
      midCapCount,
      smallCapCount,
      profitableStocks,
      lossStocks,
    };

    // Add calculated fields and color coding to each stock
    const stocksWithCalculations = stocks.map((stock) => {
      const pnlData = calculateStockPnL(
        stock.quantity,
        stock.buyPrice,
        stock.currentPrice
      );
      const pnlFormatted = formatPnL(pnlData.pnl);

      return {
        ...stock,
        ...pnlData,
        pnlColor: pnlFormatted.color,
        isProfitable: pnlData.pnl >= 0,
        pnlDisplay: pnlFormatted.value,
        pnlPercentageDisplay: formatPercentage(pnlData.pnlPercentage),
      };
    });

    // Group by sector for additional insights
    const sectorBreakdown = stocks.reduce((acc, stock) => {
      if (!acc[stock.sector]) {
        acc[stock.sector] = {
          count: 0,
          totalInvestment: 0,
          totalCurrentValue: 0,
          totalPnL: 0,
        };
      }
      acc[stock.sector].count++;
      acc[stock.sector].totalInvestment += stock.investedAmount;
      acc[stock.sector].totalCurrentValue += stock.currentValue;
      acc[stock.sector].totalPnL += stock.pnl;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        stocks: stocksWithCalculations,
        summary,
        sectorBreakdown,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific stock by ID
 */
const getStockById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stock = await prisma.stock.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Stock not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Add calculated fields
    const pnlData = calculateStockPnL(
      stock.quantity,
      stock.buyPrice,
      stock.currentPrice
    );
    const pnlFormatted = formatPnL(pnlData.pnl);

    const stockWithCalculations = {
      ...stock,
      ...pnlData,
      pnlColor: pnlFormatted.color,
      isProfitable: pnlData.pnl >= 0,
      pnlDisplay: pnlFormatted.value,
      pnlPercentageDisplay: formatPercentage(pnlData.pnlPercentage),
    };

    res.json({
      success: true,
      data: stockWithCalculations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new stock
 */
const createStock = async (req, res, next) => {
  try {
    // Ensure default user exists

    const stockData = {
      ...req.body,
      userId: req.user.id,
    };

    // Calculate invested amount if not provided
    if (!stockData.investedAmount) {
      stockData.investedAmount = stockData.quantity * stockData.buyPrice;
    }

    // Set current price to buy price if not provided (for new stocks)
    if (!stockData.currentPrice) {
      stockData.currentPrice = stockData.buyPrice;
    }

    // Calculate P&L values
    const pnlData = calculateStockPnL(
      stockData.quantity,
      stockData.buyPrice,
      stockData.currentPrice
    );
    stockData.currentValue = pnlData.currentValue;
    stockData.pnl = pnlData.pnl;
    stockData.pnlPercentage = pnlData.pnlPercentage;

    // Validate symbol uniqueness for the user (optional - users might have same stock multiple times)
    // For now, we'll allow duplicate symbols as users might buy same stock at different times

    const stock = await prisma.stock.create({
      data: stockData,
    });

    res.status(201).json({
      success: true,
      data: stock,
      message: "Stock created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock
 */
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if stock exists and belongs to user
    const existingStock = await prisma.stock.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingStock) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Stock not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Recalculate invested amount if quantity or buy price changed
    if (updateData.quantity || updateData.buyPrice) {
      const quantity = updateData.quantity || existingStock.quantity;
      const buyPrice = updateData.buyPrice || existingStock.buyPrice;
      updateData.investedAmount = quantity * buyPrice;
    }

    // Recalculate P&L if any relevant values changed
    if (updateData.quantity || updateData.buyPrice || updateData.currentPrice) {
      const quantity = updateData.quantity || existingStock.quantity;
      const buyPrice = updateData.buyPrice || existingStock.buyPrice;
      const currentPrice =
        updateData.currentPrice || existingStock.currentPrice;

      const pnlData = calculateStockPnL(quantity, buyPrice, currentPrice);
      updateData.currentValue = pnlData.currentValue;
      updateData.pnl = pnlData.pnl;
      updateData.pnlPercentage = pnlData.pnlPercentage;
    }

    const stock = await prisma.stock.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: stock,
      message: "Stock updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete stock
 */
const deleteStock = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if stock exists and belongs to user
    const existingStock = await prisma.stock.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingStock) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Stock not found",
        timestamp: new Date().toISOString(),
      });
    }

    await prisma.stock.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Stock deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ensure default user exists for MVP
 */
const ensureDefaultUser = async () => {
  const existingUser = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: req.user.id,
        email: "default@fiscalflow.com",
        name: "Default User",
      },
    });
  }
};

module.exports = {
  getAllStocks,
  getStockById,
  createStock,
  updateStock,
  deleteStock,
};
