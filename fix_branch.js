const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Main Branch',
        isMain: true
      }
    });
    console.log('Created Main Branch with ID:', branch.id);
  } else {
    console.log('Branch already exists:', branch.id);
  }

  // Update all products without a branch to use this branch
  const updated = await prisma.product.updateMany({
    where: { branchId: null },
    data: { branchId: branch.id }
  });
  console.log('Updated products:', updated.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
