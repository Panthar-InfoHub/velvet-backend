import { db } from "../../server.js";

class UserInsuranceServiceClass {
    async create(user_id: string, data: any) {
        return await db.userInsurance.upsert({
            where: { user_id: user_id },
            update: { ...data },
            create: {
                user_id: user_id,
                ...data,
            },
        });
    }

    async update(user_id: string, data: any) {
        return await db.userInsurance.update({
            where: { user_id: user_id },
            data: { ...data },
        });
    }

    async get_by_user(user_id: string) {
        return await db.userInsurance.findUnique({
            where: { user_id: user_id },
        });
    }
}

export const user_insurance_service = new UserInsuranceServiceClass();