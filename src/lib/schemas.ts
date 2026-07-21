import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().min(1, "El slug es obligatorio"),
  description: z.string().nullable(),
  specifications: z.string().nullable(),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  cost_price: z.number().min(0).nullable(),
  compare_price: z.number().min(0).nullable(),
  currency: z.string().default("USD"),
  price_cup: z.number().min(0).nullable(),
  extra_cup_per_usd: z.number().min(0).nullable(),
  category_id: z.string().uuid().nullable(),
  images: z.array(z.string()).default([]),
  main_image_index: z.number().int().min(0).default(0),
  stock: z.number().int().min(0, "El stock debe ser mayor o igual a 0"),
  low_stock_threshold: z.number().int().min(0).nullable(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  warranty_type: z.enum(["electronics", "charger", "no-warranty"]).nullable(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().min(1, "El slug es obligatorio"),
  description: z.string().nullable(),
  sort_order: z.number().int().default(0),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const serviceCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().min(1, "El slug es obligatorio"),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().min(1, "El slug es obligatorio"),
  short_description: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().min(0).nullable(),
  price_label: z.string().nullable(),
  currency: z.enum(["USD", "CUP"]).default("USD"),
  category_id: z.string().uuid().nullable(),
  image_url: z.string().nullable(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
export type ServiceCategoryFormValues = z.infer<typeof serviceCategorySchema>;
