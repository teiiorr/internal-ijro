import "dotenv/config";
import { startCronJobs } from "@/lib/jobs";

startCronJobs();

// Keep the process alive
setInterval(() => {}, 1 << 30);
console.log("[worker] running");
