import {
  deleteAdminHelpFaqResponse,
  updateAdminHelpFaqResponse,
} from "@/app/api/help-faqs/_shared";

export async function PUT(
  request: Request,
  context: { params: Promise<{ faqId: string }> },
) {
  const params = await context.params;
  return updateAdminHelpFaqResponse(request, params.faqId);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ faqId: string }> },
) {
  const params = await context.params;
  return deleteAdminHelpFaqResponse(request, params.faqId);
}
