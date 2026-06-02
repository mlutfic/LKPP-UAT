import { getPublicHelpFaqListResponse } from "@/app/api/help-faqs/_shared";

export async function GET(request: Request) {
  return getPublicHelpFaqListResponse(request);
}
