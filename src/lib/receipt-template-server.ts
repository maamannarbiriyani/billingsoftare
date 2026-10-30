import { prisma } from "@/lib/prisma";
import {
  DEFAULT_RECEIPT_CONFIG,
  normalizeReceiptConfig,
  type ReceiptConfig,
  type ReceiptTemplateData,
} from "@/lib/receipt-template";

/** Missing tables (database not updated yet) are expected and handled — one line, not a stack trace. */
function logTemplateError(msg: string, e: unknown) {
  if ((e as { code?: string })?.code === "P2021") console.warn(msg + ": Bill Design tables not created yet");
  else console.error(msg, e);
}

export type ReceiptTemplateRow = { id: number; name: string; config: ReceiptConfig; logo: string | null };

/**
 * Everything the Bill Design settings screen needs. Creates "Template 1"
 * (the classic bill) on first use. `ready: false` means the database
 * table doesn't exist yet.
 */
export async function loadBillDesignSettings() {
  try {
    if ((await prisma.receiptTemplate.count()) === 0) {
      await prisma.receiptTemplate.create({
        data: { name: "Template 1", config: JSON.stringify(DEFAULT_RECEIPT_CONFIG) },
      });
    }
    const [templates, branchRows, links] = await Promise.all([
      prisma.receiptTemplate.findMany({ orderBy: { id: "asc" } }),
      prisma.branch.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
      prisma.branchReceiptTemplate.findMany(),
    ]);
    const linkOf = new Map(links.map((l) => [l.branchId, l.templateId]));
    const branches = branchRows.map((b) => ({ ...b, receiptTemplateId: linkOf.get(b.id) ?? null }));
    return {
      ready: true as const,
      templates: templates.map(
        (t): ReceiptTemplateRow => ({ id: t.id, name: t.name, config: normalizeReceiptConfig(t.config), logo: t.logo }),
      ),
      branches,
    };
  } catch (e) {
    logTemplateError("Bill Design settings unavailable", e);
    return { ready: false as const, templates: [] as ReceiptTemplateRow[], branches: [] };
  }
}

/**
 * The Bill Design template a branch prints with: its assigned template,
 * else the first one. Returns null (= classic Template 1 layout) when no
 * template exists or loading fails, so billing never breaks over this.
 */
export async function getReceiptTemplateForBranch(branchId: number | null): Promise<ReceiptTemplateData | null> {
  try {
    let tpl = null;
    if (branchId) {
      const link = await prisma.branchReceiptTemplate.findUnique({ where: { branchId } });
      if (link) tpl = await prisma.receiptTemplate.findUnique({ where: { id: link.templateId } });
    }
    if (!tpl) tpl = await prisma.receiptTemplate.findFirst({ orderBy: { id: "asc" } });
    if (!tpl) return null;
    return { config: normalizeReceiptConfig(tpl.config), logo: tpl.logo };
  } catch (e) {
    logTemplateError("Receipt template load failed — printing with Template 1", e);
    return null;
  }
}
