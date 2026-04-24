import { Response } from "express";
import { ApiResponse, PaginatedResponse } from "../types/index.js";

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
): Response => {
  const response: ApiResponse<T> = {
    success: statusCode < 400,
    message,
    statusCode,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendPaginatedResponse = <T>(
  res: Response,
  statusCode: number,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  },
): Response => {
  const response: PaginatedResponse<T> = {
    success: statusCode < 400,
    data,
    pagination,
  };

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: string,
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    message,
    statusCode,
  };

  if (error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};
