const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const event = await p.event.findUnique({
    where: { slug: 'globus' },
    select: { id: true, slug: true, status: true, isPagePublished: true }
  });
  console.log(JSON.stringify(event, null, 2));
  await p.$disconnect();
}
main();
