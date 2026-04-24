import { query } from "../../config/database.js";
import { sendResponse } from "../../utils/response.js";
import { Request, Response } from "express";

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { invoice_id, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT 
        p.id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.transaction_id,
        p.status,
        p.remarks,
        i.invoice_number,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        s.admission_number,
        p.created_at
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN students s ON i.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (invoice_id) {
      sql += ` AND p.invoice_id = $${params.length + 1}`;
      params.push(invoice_id);
    }

    if (status) {
      sql += ` AND p.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM payments WHERE 1=1`;
    const countParams: any[] = [];

    if (invoice_id) {
      countSql += ` AND invoice_id = $${countParams.length + 1}`;
      countParams.push(invoice_id);
    }

    if (status) {
      countSql += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams);

    sendResponse(res, 200, "Payments retrieved", {
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit)),
        currentPage: Number(page),
      },
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching payments", { error: err.message });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT 
        p.id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.transaction_id,
        p.status,
        p.remarks,
        i.invoice_number,
        i.total_amount,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        u.email,
        s.admission_number,
        p.created_at,
        p.updated_at
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN students s ON i.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE p.id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Payment not found");
    }

    sendResponse(res, 200, "Payment retrieved", { data: result.rows[0] });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching payment", { error: err.message });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const {
      invoice_id,
      payment_date,
      amount,
      payment_method,
      transaction_id,
      remarks,
    } = req.body;

    if (!invoice_id || !amount || !payment_method) {
      return sendResponse(res, 400, "Missing required fields");
    }

    // Get invoice details
    const invoiceResult = await query(
      `SELECT total_amount, paid_amount, status FROM invoices WHERE id = $1`,
      [invoice_id],
    );

    if (invoiceResult.rows.length === 0) {
      return sendResponse(res, 404, "Invoice not found");
    }

    const { total_amount, paid_amount: already_paid } = invoiceResult.rows[0];
    const newPaidAmount = Number(already_paid) + Number(amount);

    // Determine new status
    let newStatus = "partial";
    if (newPaidAmount >= total_amount) {
      newStatus = "paid";
    } else if (newPaidAmount > 0) {
      newStatus = "partial";
    }

    // Create payment
    const paymentResult = await query(
      `
      INSERT INTO payments 
        (invoice_id, payment_date, amount, payment_method, transaction_id, remarks, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'completed')
      RETURNING id, payment_date, amount, payment_method, transaction_id, status, created_at
      `,
      [
        invoice_id,
        payment_date || new Date(),
        amount,
        payment_method,
        transaction_id,
        remarks,
      ],
    );

    // Update invoice paid_amount and status
    await query(
      `
      UPDATE invoices
      SET paid_amount = paid_amount + $1,
          status = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [amount, newStatus, invoice_id],
    );

    sendResponse(res, 201, "Payment recorded successfully", {
      data: paymentResult.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error creating payment", { error: err.message });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const result = await query(
      `
      UPDATE payments
      SET 
        status = COALESCE($1, status),
        remarks = COALESCE($2, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
      `,
      [status, remarks, id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Payment not found");
    }

    sendResponse(res, 200, "Payment updated successfully", {
      data: result.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error updating payment", { error: err.message });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get payment details
    const paymentResult = await query(
      `SELECT invoice_id, amount FROM payments WHERE id = $1`,
      [id],
    );

    if (paymentResult.rows.length === 0) {
      return sendResponse(res, 404, "Payment not found");
    }

    const { invoice_id, amount } = paymentResult.rows[0];

    // Revert invoice paid_amount
    await query(
      `
      UPDATE invoices
      SET paid_amount = paid_amount - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [amount, invoice_id],
    );

    // Delete payment
    await query(`DELETE FROM payments WHERE id = $1`, [id]);

    sendResponse(res, 200, "Payment deleted successfully");
  } catch (err: any) {
    sendResponse(res, 500, "Error deleting payment", { error: err.message });
  }
};

export const getPaymentsByInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const result = await query(
      `
      SELECT 
        id,
        payment_date,
        amount,
        payment_method,
        transaction_id,
        status,
        remarks,
        created_at
      FROM payments
      WHERE invoice_id = $1
      ORDER BY created_at DESC
      `,
      [invoiceId],
    );

    sendResponse(res, 200, "Invoice payments retrieved", {
      data: result.rows,
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching invoice payments", {
      error: err.message,
    });
  }
};

export const getPaymentStatistics = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `
      SELECT 
        COUNT(DISTINCT p.id) as total_payments,
        SUM(p.amount) as total_paid,
        COUNT(DISTINCT p.invoice_id) as invoices_with_payments,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments
      FROM payments p
      `,
      [],
    );

    sendResponse(res, 200, "Payment statistics retrieved", {
      data: result.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching payment statistics", {
      error: err.message,
    });
  }
};
