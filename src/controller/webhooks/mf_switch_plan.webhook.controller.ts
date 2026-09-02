import { Request, Response, NextFunction } from "express";
import logger from "../../middleware/logger.js";
import { fp_webhook_event_service } from "../../services/webhooks/fp-webhook-event.service.js";
import { mf_transaction_plan_service } from "../../services/mf-transaction-plan.service.js";

const ALLOWED_EVENTS = new Set([
    "mf_switch_plan.created",
    "mf_switch_plan.activated",
    "mf_switch_plan.cancelled",
    "mf_switch_plan.failed",
]);

export const handleMfSwitchPlanWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    let event_id: string | undefined;

    try {
        const event = fp_webhook_event_service.parse_event(req.body);
        event_id = event.id;

        const object_type = event.data.object.object;
        const fp_id = event.data.object.id;

        if (event.object !== "event") {
            res.status(400).json({
                success: false,
                message: "Invalid FP webhook event object",
            });
            return;
        }

        if (object_type !== "mf_switch_plan") {
            res.status(400).json({
                success: false,
                message: "Invalid webhook object type",
            });
            return;
        }

        if (!ALLOWED_EVENTS.has(event.type)) {
            logger.warn("Unsupported MF switch plan webhook event", {
                event_id: event.id,
                event_type: event.type,
                fp_id,
            });

            res.status(200).json({
                success: true,
                processed: false,
                unsupported_event: true,
            });
            return;
        }

        logger.info("Received MF switch plan webhook", {
            event_id: event.id,
            event_type: event.type,
            event_time: event.time,
            fp_id,
        });

        const claimed = await fp_webhook_event_service.claim_event(event.id);

        if (!claimed) {
            logger.info("Duplicate MF switch plan webhook ignored", {
                event_id: event.id,
                event_type: event.type,
            });

            res.status(200).json({
                success: true,
                duplicate: true,
            });
            return;
        }

        const trusted_object =
            await fp_webhook_event_service.fetch_trusted_object(
                object_type,
                fp_id,
            );

        if (!trusted_object) {
            logger.warn(
                "MF switch plan webhook could not fetch trusted FP object",
                {
                    event_id: event.id,
                    fp_id,
                },
            );

            res.status(200).json({
                success: true,
                processed: false,
            });
            return;
        }

        const updated =
            await mf_transaction_plan_service.sync_switch_plan_from_webhook(
                trusted_object,
            );

        logger.info("MF switch plan webhook processed successfully", {
            event_id: event.id,
            event_type: event.type,
            fp_id: updated.fp_id,
            state: updated.state,
        });

        res.status(200).json({
            success: true,
            processed: true,
            data: {
                fp_id: updated.fp_id,
                state: updated.state,
            },
        });

        return;
    } catch (error) {
        if (event_id) {
            await fp_webhook_event_service.release_event(event_id);
        }

        logger.error(
            "MF switch plan webhook processing error:",
            error,
        );

        next(error);
        return;
    }
};