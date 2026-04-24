import { query } from "../../config/database.js";
import { sendResponse } from "../../utils/response.js";
import { Request, Response } from "express";

export const getAllFeeStructures = async (req: Request, res: Response) => {
  try {
    const { class_id, academic_year_id, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT 
        fs.id,
        fs.amount,
        fs.frequency,
        fs.due_date,
        fs.description,
        fc.category_name,
        c.class_name,
        c.section_name,
        ay.year_name,
        fs.created_at
      FROM fee_structures fs
      JOIN fee_categories fc ON fs.fee_category_id = fc.id
      LEFT JOIN classes c ON fs.class_id = c.id
      JOIN academic_years ay ON fs.academic_year_id = ay.id
      WHERE fc.is_active = true
    `;

    const params: any[] = [];

    if (class_id) {
      sql += ` AND fs.class_id = $${params.length + 1}`;
      params.push(class_id);
    }

    if (academic_year_id) {
      sql += ` AND fs.academic_year_id = $${params.length + 1}`;
      params.push(academic_year_id);
    }

    sql += ` ORDER BY fs.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM fee_structures fs JOIN fee_categories fc ON fs.fee_category_id = fc.id WHERE fc.is_active = true`,
      [],
    );

    sendResponse(res, 200, "Fee structures retrieved", {
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit)),
        currentPage: Number(page),
      },
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching fee structures", {
      error: err.message,
    });
  }
};

export const getFeeStructureById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT 
        fs.id,
        fs.amount,
        fs.frequency,
        fs.due_date,
        fs.description,
        fc.category_name,
        fc.id as category_id,
        c.class_name,
        c.id as class_id,
        ay.year_name,
        ay.id as academic_year_id,
        fs.created_at,
        fs.updated_at
      FROM fee_structures fs
      JOIN fee_categories fc ON fs.fee_category_id = fc.id
      LEFT JOIN classes c ON fs.class_id = c.id
      JOIN academic_years ay ON fs.academic_year_id = ay.id
      WHERE fs.id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Fee structure not found");
    }

    sendResponse(res, 200, "Fee structure retrieved", { data: result.rows[0] });
  } catch (err: any) {
    sendResponse(res, 500, "Error fetching fee structure", {
      error: err.message,
    });
  }
};

export const createFeeStructure = async (req: Request, res: Response) => {
  try {
    const {
      academic_year_id,
      class_id,
      fee_category_id,
      amount,
      frequency,
      due_date,
      description,
    } = req.body;

    // Validate required fields
    if (!academic_year_id || !fee_category_id || !amount || !frequency) {
      return sendResponse(res, 400, "Missing required fields");
    }

    const result = await query(
      `
      INSERT INTO fee_structures 
        (academic_year_id, class_id, fee_category_id, amount, frequency, due_date, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, amount, frequency, due_date, description, fee_category_id, class_id, academic_year_id, created_at
      `,
      [
        academic_year_id,
        class_id,
        fee_category_id,
        amount,
        frequency,
        due_date,
        description,
      ],
    );

    sendResponse(res, 201, "Fee structure created successfully", {
      data: result.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error creating fee structure", {
      error: err.message,
    });
  }
};

export const updateFeeStructure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, frequency, due_date, description, fee_category_id } =
      req.body;

    const result = await query(
      `
      UPDATE fee_structures
      SET 
        amount = COALESCE($1, amount),
        frequency = COALESCE($2, frequency),
        due_date = COALESCE($3, due_date),
        description = COALESCE($4, description),
        fee_category_id = COALESCE($5, fee_category_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
      `,
      [amount, frequency, due_date, description, fee_category_id, id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Fee structure not found");
    }

    sendResponse(res, 200, "Fee structure updated successfully", {
      data: result.rows[0],
    });
  } catch (err: any) {
    sendResponse(res, 500, "Error updating fee structure", {
      error: err.message,
    });
  }
};

export const deleteFeeStructure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM fee_structures WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return sendResponse(res, 404, "Fee structure not found");
    }

    sendResponse(res, 200, "Fee structure deleted successfully");
  } catch (err: any) {
    sendResponse(res, 500, "Error deleting fee structure", {
      error: err.message,
    });
  }
};
