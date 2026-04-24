import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { loadEnv } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendResponse } from "./utils/response.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import studentsRoutes from "./routes/students.js";
import teachersRoutes from "./routes/teachers.js";
import classesRoutes from "./routes/classes.js";
import subjectsRoutes from "./routes/subjects.js";
import financeRoutes from "./routes/finance.js";
import attendanceRoutes from "./routes/attendance.js";
import enrollmentRoutes from "./routes/enrollments.js";
import timetableRoutes from "./routes/timetables.js";
import marksRoutes from "./routes/marks.js";
import examsRoutes from "./routes/exams.js";
import reportCardsRoutes from "./routes/reportCards.js";
import assignmentsRoutes from "./routes/assignments.js";

loadEnv();

const app = express();

// ==================== MIDDLEWARE ====================

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "http://localhost:3000"
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
          "http://52.90.52.178:3000",
        ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

console.log("CORS Configuration:", corsOptions);
app.use(cors(corsOptions));

// checking connectivity
console.log(
  "DB HOST (You are 100% Connected to Supabase here is the DB HOST):",
  process.env.DB_HOST,
);

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Compression
app.use(compression());

// Logging
app.use(morgan("combined"));

// ==================== ROUTES ====================

// Health check
app.get("/health", (req: Request, res: Response) => {
  sendResponse(res, 200, "Server is running", { timestamp: new Date() });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Academic routes
app.use("/api/academic/students", studentsRoutes);
app.use("/api/academic/teachers", teachersRoutes);
app.use("/api/academic/classes", classesRoutes);
app.use("/api/academic/subjects", subjectsRoutes);
app.use("/api/academic/attendance", attendanceRoutes);
app.use("/api/academic/enrollments", enrollmentRoutes);
app.use("/api/academic/timetables", timetableRoutes);
app.use("/api/academic/marks", marksRoutes);
app.use("/api/academic/exams", examsRoutes);
app.use("/api/academic/report-cards", reportCardsRoutes);
app.use("/api/academic/assignments", assignmentsRoutes);

// Finance routes
app.use("/api/finance", financeRoutes);

// ==================== SWAGGER DOCUMENTATION ====================

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "School Management System API",
      version: "1.0.0",
      description: "RESTful API for School Management System",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000/api",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// ==================== 404 HANDLER ====================

app.all("*", (req: Request, res: Response) => {
  sendResponse(res, 404, "Route not found");
});

// ==================== ERROR HANDLER ====================

app.use(errorHandler);

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
});

export default app;
