// src/server.ts
// This is the main entry point for the Express application.
// It initializes the Express app, sets up middleware, and starts the server.

import app from './app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Function to test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Please check your DATABASE_URL in .env file');
    process.exit(1);
  }
}

// Function to start the server
async function startServer() {
  try {
    // Test database connection first
    await testDatabaseConnection();
    
    // Start the HTTP server
    const server = app.listen(PORT, () => {
      console.log('🚀 Education CRM Backend Server Started');
      console.log(`📍 Server is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
      console.log(`📚 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('---------------------------------------------------');
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('📴 HTTP server closed');
        
        try {
          await prisma.$disconnect();
          console.log('🔌 Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during database disconnection:', error);
          process.exit(1);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forcefully shutting down after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 