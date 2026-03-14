import { db } from "../../server.js";
import type { Prisma } from "../../prisma/generated/prisma/client.js";

type TxClient = Prisma.TransactionClient;

class UserFinanceServiceClass {
    async create(user_id: string, data: any, tx: TxClient | typeof db = db) {
        return await tx.userFinance.upsert({
            where: { user_id: user_id },
            update: { ...data },
            create: {
                user_id: user_id,
                ...data,
            },
        });
    }

    async update(user_id: string, data: any) {
        return await db.userFinance.update({
            where: { user_id: user_id },
            data: { ...data },
        });
    }

    async get_by_user(user_id: string) {
        return await db.userFinance.findUnique({
            where: { user_id: user_id },
        });
    }

    async delete(user_id: string) {
        return await db.userFinance.delete({
            where: { user_id: user_id },
        });
    }
}

export const user_finance_service = new UserFinanceServiceClass();
