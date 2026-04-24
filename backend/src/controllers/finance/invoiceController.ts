import { query } from "../../config/database.js";
import { sendResponse } from "../../utils/response.js";
import { Request, Response } from "express";

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      status,
      academic_year_id,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.status,
        i.notes,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        s.admission_number,
        ay.year_name,
        i.created_at
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN academic_years ay ON i.academic_year_id = ay.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (student_id) {
      sql += ` AND i.student_id = $${params.length + 1}`;
      params.push(student_id);
    }

    if (status) {
      sql += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    if (academic_year_id) {
      sql += ` AND i.academic_year_id = $${params.length + 1}`;
      params.push(academic_year_id);
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM invoices WHERE 1=1`;
    const countParams: any[] = [];

    if (student_id) {
      countSql += ` AND student_id = $${countParams.length + 1}`;
      countParams.push(student_id);
    }

    if (status) {
      countSql += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    if (academic_year_id) {
      countSql += ` AND academic_year_id = $${countParams.length + 1}`;
      countParams.push(academic_year_id);
    }

    const countResult = await query(countSql, countParams);

    sendResponse(res, 200, "Invoices retrieved", {
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit)),
        currentPage: Number(page),
      },
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching invoices", { error: err.message });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoiceResult = await query(
      `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.status,
        i.notes,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        u.email as student_email,
        s.admission_number,
        ay.year_name,
        i.created_at,
        i.updated_at
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN academic_years ay ON i.academic_year_id = ay.id
      WHERE i.id = $1
      `,
      [id],
    );

    if (invoiceResult.rows.length === 0) {
      return sendResponse(res, 404, "Invoice not found");
    }

    // Get invoice items
    const itemsResult = await query(
      `
      SELECT 
        ii.id,
        ii.description,
        ii.amount,
        ii.quantity,
        fc.category_name
      FROM invoice_items ii
      JOIN fee_categories fc ON ii.fee_category_id = fc.id
      WHERE ii.invoice_id = $1
      `,
      [id],
    );

    sendResponse(res, 200, "Invoice retrieved", {
      data: {
        ...invoiceResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching invoice", { error: err.message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      academic_year_id,
      invoice_number,
      invoice_date,
      due_date,
      total_amount,
      notes,
      items,
    } = req.body;

    if (!student_id || !academic_year_id || !invoice_number || !total_amount) {
      return sendResponse(res, 400, "Missing required fields");
    }

    const invoiceResult = await query(
      `
      INSERT INTO invoices 
        (student_id, academic_year_id, invoice_number, invoice_date, due_date, total_amount, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, invoice_number, invoice_date, due_date, total_amount, status, created_at
      `,
      [
        student_id,
        academic_year_id,
        invoice_number,
        invoice_date || new Date(),
        due_date,
        total_amount,
        notes,
      ],
    );

    const invoiceId = invoiceResult.rows[0].id;

    // Add invoice items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `
          INSERT INTO invoice_items 
            (invoice_id, fee_category_id, description, amount, quantity)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            invoiceId,
            item.fee_category_id,
            item.description,
            item.amount,
            item.quantity || 1,
          ],
        );
      }
    }

    sendResponse(res, 201, "Invoice created successfully", {
      data: invoiceResult.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error creating invoice", { error: err.message });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, due_date } = req.body;

    const result = await query(
      `
      UPDATE invoices
      SET 
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        due_date = COALESCE($3, due_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [status, notes, due_date, id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Invoice not found");
    }

    sendResponse(res, 200, "Invoice updated successfully", {
      data: result.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error updating invoice", { error: err.message });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM invoices WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Invoice not found");
    }

    sendResponse(res, 200, "Invoice deleted successfully");
  } catch (err: any) {
    sendResponse(res, 500, "Error deleting invoice", { error: err.message });
  }
};

export const getInvoicesByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.status,
        ay.year_name,
        i.created_at
      FROM invoices i
      JOIN academic_years ay ON i.academic_year_id = ay.id
      WHERE i.student_id = $1
    `;

    const params: any[] = [studentId];

    if (status) {
      sql += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    sendResponse(res, 200, "Student invoices retrieved", {
      data: result.rows,
      pagination: {
        total: result.rows.length,
        currentPage: Number(page),
      },
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching student invoices", {
      error: err.message,
    });
  }
};
