import { NextFunction, Request, Response } from "express";
import { fire_report_service } from "../services/fire.report.service.js";
import { to_report_view_data } from "../lib/fire-report.transformer.js";
import { generateFireReportHTML } from "../lib/fire-report.template.js";
import { renderPDF } from "../lib/fire-report.renderer.js";
import logger from "../middleware/logger.js";

export const fire_report_controller = {
    async get_fire_report(req: Request, res: Response, next: NextFunction) {
        try {
            const user_id: string = req.user!.id;

            // projection_years: must be one of 5 | 10 | 20, defaults to 20
            const raw_years = Number(req.query.projection_years);
            const projection_years = [5, 10, 20].includes(raw_years) ? raw_years : 20;

            logger.info(`Generating FIRE report for user_id: ${user_id} (projection_years=${projection_years})`);

            const data = await fire_report_service.get_fire_report(user_id, projection_years);
            res.status(200).json({
                code: 200,
                message: "FIRE report generated successfully",
                data
            });
        } catch (error) {
            logger.error(`Error generating FIRE report: ${error instanceof Error ? error.message : String(error)}`);
            next(error);
            return;
        }
    },

    async get_fire_report_pdf(req: Request, res: Response, next: NextFunction) {
        try {
            const user_id: string = req.user!.id;

            logger.info(`Generating FIRE PDF report for user_id: ${user_id}`);

            const report = await fire_report_service.get_fire_report(user_id, 30);
            const view_data = to_report_view_data(report);
            const html = generateFireReportHTML(view_data);
            const buffer = await renderPDF(html);

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="velvet-wealth-report-${user_id}.pdf"`,
                "Content-Length": buffer.length.toString(),
            });
            res.send(buffer);
        } catch (error) {
            logger.error(`Error generating FIRE PDF: ${error instanceof Error ? error.message : String(error)}`);
            next(error);
            return;
        }
    },
};
