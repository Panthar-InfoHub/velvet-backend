import { db } from "../../server.js";

class UserFinanceServiceClass {
    async create(user_id: string, data: any) {
        return await db.userFinance.upsert({
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
