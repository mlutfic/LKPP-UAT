import {
  proxyAdminServiceDelete,
  proxyAdminServiceUpdate,
} from "@/app/api/admin/services/_shared";

export async function PUT(
  request: Request,
  context: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await context.params;
  return proxyAdminServiceUpdate(request, serviceId);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await context.params;
  return proxyAdminServiceDelete(request, serviceId);
}
