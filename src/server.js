// Starts the API on port 3000 (npm run api). Not imported by tests.
import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Module 2 API on http://localhost:${port}/api/v1`));
