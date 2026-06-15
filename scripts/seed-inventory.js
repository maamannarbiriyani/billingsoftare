const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding inventory...");

  // Create Ingredient
  const paneer = await prisma.ingredient.create({
    data: {
      name: "Paneer",
      unit: "g",
      currentStock: 1000, // 1 kg
      costPerUnit: 0.40, // 400 rs / kg
    }
  });

  console.log(`Created Ingredient: ${paneer.name} (Stock: ${paneer.currentStock} ${paneer.unit})`);

  // Find Product
  let product = await prisma.product.findFirst({
    where: { name: "Paneer Butter Masala" }
  });

  if (!product) {
    product = await prisma.product.create({
      data: { name: "Paneer Butter Masala", price: 250, category: "Aggregator Items" }
    });
  }

  // Create Recipe Item (BOM)
  await prisma.recipeItem.create({
    data: {
      productId: product.id,
      ingredientId: paneer.id,
      quantityUsed: 150 // 150g per dish
    }
  });

  console.log(`Created Recipe: 1 ${product.name} uses 150 ${paneer.unit} of ${paneer.name}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
