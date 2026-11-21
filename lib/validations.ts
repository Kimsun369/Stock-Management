import { z } from 'zod'

export const stockInSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(100),
  quantity: z.coerce.number().positive('Quantity must be greater than zero').max(999999, 'Quantity is too large'),
  unit: z.string().trim().max(50).optional(),
  supplierId: z.string().trim().max(100).optional(),
  unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative').max(999999, 'Unit cost is too large').optional(),
  currency: z.string().trim().max(10).optional(),
  invoiceNumber: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const stockOutSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(100),
  quantity: z.coerce.number().positive('Quantity must be greater than zero').max(999999, 'Quantity is too large'),
  unit: z.string().trim().max(50).optional(),
  reason: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const stockReturnSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(100),
  quantity: z.coerce.number().positive('Quantity must be greater than zero').max(999999, 'Quantity is too large'),
  unit: z.string().trim().max(50).optional(),
  reason: z.string().trim().min(1, 'Reason is required').max(500),
  notes: z.string().trim().max(500).optional(),
})

export const adjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(100),
  requestedChange: z.coerce.number().refine((n) => !Number.isNaN(n) && n !== 0, 'Requested change cannot be zero').refine((n) => Math.abs(n) <= 999999, 'Quantity is too large'),
  reason: z.string().trim().min(1, 'Reason is required').max(500),
  notes: z.string().trim().max(500).optional(),
})

export const leftoverRegisterSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required').max(200),
  customerPhone: z.string().trim().min(1, 'Customer phone number is required').max(50),
  storageLocation: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, 'Product is required').max(100),
        quantity: z.coerce.number().positive('Quantity must be greater than zero').max(999999),
        unit: z.string().trim().max(50).optional(),
      })
    )
    .min(1, 'At least one item must be registered')
    .max(100),
})

export const leftoverCollectSchema = z.object({
  collections: z
    .array(
      z.object({
        itemId: z.string().trim().min(1, 'Item ID is required').max(100),
        quantity: z.coerce.number().min(0, 'Quantity cannot be negative').max(999999),
      })
    )
    .min(1, 'At least one collection item must be provided'),
  notes: z.string().trim().max(500).optional(),
})

export const leftoverCancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  nameKm: z.string().trim().max(200).optional(),
  sku: z.string().trim().max(100).default(''),
  categoryId: z.string().trim().min(1, 'Category is required').max(100),
  brand: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(50).optional(),
  altUnit: z.string().trim().max(50).optional(),
  conversionRate: z.coerce.number().min(1, 'Conversion rate must be at least 1').max(999999).optional(),
  purchaseCost: z.coerce.number().min(0, 'Purchase cost cannot be negative').max(999999).optional(),
  minStock: z.coerce.number().min(0, 'Min stock cannot be negative').max(999999).optional(),
  defaultSupplierId: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  descriptionKm: z.string().trim().max(1000).optional(),
})
