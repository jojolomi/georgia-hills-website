import { z } from "zod";

export const AdminActionRequestSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.any()).optional().default({})
});

export const AdminActionResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  data: z.any().optional(),
  message: z.string().optional()
});

export const CmsPageWorkflowStatus = z.enum(["draft", "published"]);
export const LeadStatus = z.enum(["new", "contacted", "quoted", "won", "lost"]);
