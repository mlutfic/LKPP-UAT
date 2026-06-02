import {
  listAdminServiceCatalogRows,
  proxyAdminServiceCreate,
} from "@/app/api/admin/services/_shared";

export async function GET() {
  return listAdminServiceCatalogRows();
}

export async function POST(request: Request) {
  return proxyAdminServiceCreate(request);
}
