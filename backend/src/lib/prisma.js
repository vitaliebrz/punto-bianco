import { PrismaClient } from '@prisma/client';

// Un singur client pentru toată aplicația: conexiunile la baza de date se reutilizează.
const prisma = new PrismaClient();

export default prisma;
