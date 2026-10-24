// One Prisma client for the whole application and the tests.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

export const prisma = new PrismaClient();
