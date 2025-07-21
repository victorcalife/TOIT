// Certifique-se de instalar as dependências:
// npm install express
// npm install --save-dev @types/expresse

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';

// Fallback para createError caso o middleware não exista
let createError: (msg: string, code?: number) => Error;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createError = require('../middleware/errorHandler').createError;
} catch {
  createError = (msg: string, code = 500) => {
    const err: any = new Error(msg);
    err.status = code;
    return err;
  };
}

const router = Router();

// Lead capture for Easis landing page
router.post('/easis-lead', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, company, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !company) {
      return next(createError('Name, email and company are required', 400));
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(createError('Invalid email format', 400));
    }

    // TODO: Save to database when leads table is created
    const leadData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim(),
      phone: phone?.trim() || null,
      message: message?.trim() || null,
      source: 'easis_landing',
      created_at: new Date()
    };

    console.log('📝 New Easis Lead:', leadData);

    // TODO: Send notification email
    // TODO: Add to CRM/marketing automation

    res.status(201).json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        id: `lead_${Date.now()}`, // Temporary ID
        status: 'received'
      }
    });

  } catch (error) {
    next(error);
  }
});

// General contact form
router.post('/general', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return next(createError('All fields are required', 400));
    }

    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      created_at: new Date()
    };

    console.log('📧 New Contact Message:', contactData);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: `contact_${Date.now()}`
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;