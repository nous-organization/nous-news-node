// frontend/src/p2p/routes/route-dashboard.ts
import path from "node:path";
import express, { Express } from "express";

export function registerDashboardRoutes(app: Express, handlers: any) {
  const dashboardPath = path.join(process.cwd(), "frontend/public/dashboard.html");
  
  app.use(express.static(path.join(process.cwd(), "frontend/public")));

  app.get("/dashboard", (req, res) => {
    res.sendFile(dashboardPath);
  });
}