import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";
const db = openDb();
console.log(seed(db) ? "Đã tạo dữ liệu demo." : "Đã có dữ liệu. Không ghi đè.");
db.close();
