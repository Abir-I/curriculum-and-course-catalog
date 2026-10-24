
import { prisma } from "../core/prisma.js";
import { coded, mapDbError } from "../core/errors.js";

export async function createStage(input, actor) {
  try {
    return await prisma.academicStage.create({
      data: {
        programId: input.programId,
        seqNo: input.seqNo,
        nameEn: input.nameEn,
        nameBn: input.nameBn ?? null,
        nextStageId: input.nextStageId ?? null,
      },
    });
  } catch (err) {
    throw mapDbError(err);
  }
}

export async function setNextStage(stageId, nextStageId, actor) {
  if (stageId === nextStageId) {
    throw coded("STAGE_SELF_REFERENCE", 422);
  }

  try {
    let currentId = nextStageId;
    const visited = new Set();

    while (currentId) {
      if (currentId === stageId) {
        throw coded("STAGE_LOOP", 422);
      }

      if (visited.has(currentId)) {
        throw coded("STAGE_LOOP", 422);
      }

      visited.add(currentId);

      const stage = await prisma.academicStage.findUnique({
        where: { id: currentId },
        select: { nextStageId: true },
      });

      if (!stage) break;
      currentId = stage.nextStageId;
    }

    return await prisma.academicStage.update({
      where: { id: stageId },
      data: { nextStageId },
    });
  } catch (err) {
    throw mapDbError(err);
  }
}

export async function deleteStage(stageId, actor, options = {}) {
  if (options.inUse) {
    const stage = await prisma.academicStage.update({
      where: { id: stageId },
      data: { isActive: false },
    });

    return { ...stage, deleted: false };
  }

  await prisma.academicStage.delete({
    where: { id: stageId },
  });

  return { id: stageId, isActive: false, deleted: true };
}
