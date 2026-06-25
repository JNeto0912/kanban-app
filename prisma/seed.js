import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.activityCategory.upsert({ where:{id:"particular"}, update:{}, create:{id:"particular",name:"Particular",custom:false} });
  await prisma.activityCategory.upsert({ where:{id:"igreja"},     update:{}, create:{id:"igreja",    name:"Igreja",    custom:false} });
  await prisma.activityCategory.upsert({ where:{id:"trabalho"},   update:{}, create:{id:"trabalho",  name:"Trabalho",  custom:false} });

  await prisma.financeCategory.upsert({ where:{id:"particular"},  update:{}, create:{id:"particular", name:"Particular", kind:"A pagar",   partner:false, custom:false} });
  await prisma.financeCategory.upsert({ where:{id:"igreja"},      update:{}, create:{id:"igreja",     name:"Igreja",     kind:"A pagar",   partner:false, custom:false} });
  await prisma.financeCategory.upsert({ where:{id:"trabalho"},    update:{}, create:{id:"trabalho",   name:"Trabalho",   kind:"A receber", partner:true,  custom:false} });
  await prisma.financeCategory.upsert({ where:{id:"recebimento"}, update:{}, create:{id:"recebimento",name:"Recebimento",kind:"A receber", partner:true,  custom:false} });

  console.log("✅ Seed concluído!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });