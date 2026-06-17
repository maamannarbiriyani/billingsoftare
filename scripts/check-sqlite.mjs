import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function countTables() {
  const db = await open({
    filename: './prisma/dev.db',
    driver: sqlite3.Database
  })
  
  const tables = await db.all("SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';")
  
  for (const table of tables) {
    const row = await db.get(`SELECT COUNT(*) as count FROM "${table.name}"`)
    if (row.count > 0) {
      console.log(`${table.name}: ${row.count}`)
    }
  }
  await db.close()
}

countTables()
