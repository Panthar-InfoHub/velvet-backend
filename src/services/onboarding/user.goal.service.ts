import axios from "axios";
import { UserGoalInput } from "../../lib/zod-schemas/goal.schema.js";
import { db } from "../../server.js";

class UserGoalServiceClass {
    finsys_api: string;

    constructor() {
        this.finsys_api = `${process.env.FINSYS_BASE_API}/finnsys/app/master.service.asp`;
    }

    private extract_params = (user: any, data: UserGoalInput) => {
        let params: any = {
            log: user.log,
            pwd: user.pwd,
            svc: "setgoal",
            gtp: data.goal_type_id,
            tojson: 1,
            "PROCEED.x": 1
        };

        if (data.goal_type_id === 1 || data.goal_type_id === 2) {
            params.C_NAME_1 = data.child_name;
            params.C_AGE_1 = data.child_age;
            params.C_YEAR_1 = data.years_left;
            params.C_COST_1 = data.current_goal_cost;
        } else if (data.goal_type_id === 3) {
            params.H_CURR_AGE_1 = data.current_age;
            params.C_RET_AGE_1 = data.retirement_age;
            params.C_LIFE_EXP_1 = data.life_expectancy;
            params.C_MONTHLY_SPENDING_1 = data.current_monthly_expense;
            params.C_RET_POST_1 = data.post_retirement_return;
        } else if (data.goal_type_id >= 4) {
            params.gtp = 4;
            params.GOAL_ITEM_1 = data.goal_item_id;
            params.GOAL_NAME_1 = data.goal_name;
            params.C_YEAR_1 = data.years_left;
            params.C_COST_1 = data.current_goal_cost;
        }

        params.C_INF_1 = data.inflation_rate;
        params.C_RET_1 = data.return_rate;
        params.C_SAVING_1 = data.current_saved_amount;

        return params;
    }

    async createGoal(user: any, data: UserGoalInput) {
        // Store in Database
        await db.userGoals.upsert({
            where: {
                user_goal_type_idx: {
                    user_id: user.id,
                    goal_type_id: data.goal_type_id
                }
            },
            update: {
                ...data
            },
            create: {
                user_id: user.id,
                ...data
            }
        });

        // API Params mapping based on FinSys requirements
        const params = this.extract_params(user, data);

        const res = await axios.get(this.finsys_api, { params });

        if (res.data?.goal_id) {
            // Update goal_id in UserGoals table
            await db.userGoals.updateMany({
                where: {
                    user_id: user.id,
                    goal_id: res.data.goal_id
                },
                data: {
                    goal_id: res.data.goal_id
                }
            });
        }
        return res.data;
    }

    async updateGoal(user: any, goal_id: number, data: UserGoalInput) {
        // 1. Update in Database
        await db.userGoals.updateMany({
            where: {
                user_id: user.id,
                goal_id: goal_id
            },
            data: {
                ...data
            }
        });

        // 2. API Params mapping (same as create but with gid)
        const params: any = this.extract_params(user, data);
        params.gid = goal_id;

        const res = await axios.get(this.finsys_api, { params });
        return res.data;
    }
}



export const user_goal_service = new UserGoalServiceClass();