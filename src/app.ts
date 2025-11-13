import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import config from './config';
import { errorHandler, notFound } from './middlewares/error';
import { apiLimiter } from './middlewares/rateLimit';
import ResponseHandler from './utils/response';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.urls.frontend,
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Body parser middlewares
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Data sanitization against NoSQL query injection
    this.app.use(mongoSanitize());

    // Prevent parameter pollution
    this.app.use(hpp());

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (config.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Rate limiting
    this.app.use(`/api/${config.apiVersion}`, apiLimiter);

    // Trust proxy
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check route
    this.app.get('/health', (_req: Request, res: Response) => {
      ResponseHandler.success(res, 'Server is running', {
        status: 'healthy',
        environment: config.env,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API welcome route
    this.app.get(`/api/${config.apiVersion}`, (_req: Request, res: Response) => {
      ResponseHandler.success(res, 'Welcome to SharpLook API', {
        version: config.apiVersion,
        description: config.app.description,
        documentation: `${config.urls.backend}/api/${config.apiVersion}/docs`,
      });
    });

    // Import routes
    const authRoutes = require('./routes/auth.routes').default;
    const userRoutes = require('./routes/user.routes').default;
    const categoryRoutes = require('./routes/category.routes').default;
    const serviceRoutes = require('./routes/service.routes').default;
    const bookingRoutes = require('./routes/booking.routes').default;
    const paymentRoutes = require('./routes/payment.routes').default;
    const disputeRoutes = require('./routes/dispute.routes').default;
    const reviewRoutes = require('./routes/review.routes').default;
    const chatRoutes = require('./routes/chat.routes').default;
    const notificationRoutes = require('./routes/notification.routes').default;
    const referralRoutes = require('./routes/referral.routes').default;
    const analyticsRoutes = require('./routes/analytics.routes').default;
    const subscriptionRoutes = require('./routes/subscription.routes').default;

    // Mount routes
    this.app.use(`/api/${config.apiVersion}/auth`, authRoutes);
    this.app.use(`/api/${config.apiVersion}/users`, userRoutes);
    this.app.use(`/api/${config.apiVersion}/categories`, categoryRoutes);
    this.app.use(`/api/${config.apiVersion}/services`, serviceRoutes);
    this.app.use(`/api/${config.apiVersion}/bookings`, bookingRoutes);
    this.app.use(`/api/${config.apiVersion}/payments`, paymentRoutes);
    this.app.use(`/api/${config.apiVersion}/disputes`, disputeRoutes);
    this.app.use(`/api/${config.apiVersion}/reviews`, reviewRoutes);
    this.app.use(`/api/${config.apiVersion}/chat`, chatRoutes);
    this.app.use(`/api/${config.apiVersion}/notifications`, notificationRoutes);
    this.app.use(`/api/${config.apiVersion}/referrals`, referralRoutes);
    this.app.use(`/api/${config.apiVersion}/analytics`, analyticsRoutes);
    this.app.use(`/api/${config.apiVersion}/subscriptions`, subscriptionRoutes);
  }


  private initializeErrorHandling(): void {
    // Handle 404 errors
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  public getApp(): Application {
    return this.app;
  }
}

export default new App().getApp();
