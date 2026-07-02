const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Branches:', await prisma.branch.findMany());
  console.log('Products:', await prisma.product.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
