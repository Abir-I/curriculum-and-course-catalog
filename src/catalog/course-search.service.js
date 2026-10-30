import { prisma } from "../core/prisma.js";
import { coded } from "../core/errors.js";

export async function searchCourses(input = {}, actor) {
  const page = input.page ?? 1;
  const size = input.size ?? 20;

  if (size > 100) {
    throw coded("PAGE_SIZE_TOO_LARGE", 422);
  }

  if (!Number.isInteger(page) || page < 1) {
    throw coded("INVALID_PAGE", 422);
  }

  if (!Number.isInteger(size) || size < 1) {
    throw coded("INVALID_PAGE_SIZE", 422);
  }

  const query = input.query?.trim() ?? "";

  const where = query
    ? {
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { titleEn: { contains: query, mode: "insensitive" } },
          { titleBn: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [items, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.course.count({ where }),
  ]);

  return { items, total, page, size };
}
