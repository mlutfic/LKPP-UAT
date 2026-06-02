import {
  createAdminHelpFaqResponse,
  getAdminHelpFaqListResponse,
} from "@/app/api/help-faqs/_shared";

export async function GET(request: Request) {
  return getAdminHelpFaqListResponse(request);
}

export async function POST(request: Request) {
  return createAdminHelpFaqResponse(request);
}
