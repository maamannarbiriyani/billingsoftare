import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function check() {
  const db = await open({
    filename: './prisma/dev.db',
    driver: sqlite3.Database
  })
  
  const o = await db.get(`SELECT * FROM "Order" LIMIT 1`)
  console.log(o)
}
check()
