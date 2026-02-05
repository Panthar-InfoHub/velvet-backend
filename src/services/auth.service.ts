import axios from "axios";
import { AuthResponse, DeviceDetails } from "../lib/types.js";
import logger from "../middleware/logger.js";
import { env } from "../lib/config-env.js";


class AuthServiceClass {
    finsys_api: string;

    constructor() {
        this.finsys_api = `${env.finsys_base_api}/finnsys/app/master.login.asp`;
    }

    req_otp = async (mobile: string, device: DeviceDetails): Promise<AuthResponse> => {
        const res = await axios.get(this.finsys_api, {
            params: {
                ...device,
                mob: mobile,
            },
        });

        logger.debug("OTP Request Response:", res.data);
        return res.data;
    }

    validate_otp = async (mobile: string, otp: string, device: DeviceDetails): Promise<AuthResponse> => {
        const res = await axios.get(this.finsys_api, {
            params: {
                ...device,
                mob: mobile,
                otp: otp,
            },
        });
        logger.debug("OTP Validation Response:", res.data);
        return res.data;
    }

    login_invId = async (
        mobile: string,
        otp: string,
        invid: string,
        device: DeviceDetails
    ): Promise<AuthResponse> => {
        const res = await axios.get(this.finsys_api, {
            params: {
                ...device,
                mob: mobile,
                otp: otp,
                invid: invid,
            },
        });
        return res.data;
    }

    login_creds = async (
        usr: string,
        pwd: string,
        device: DeviceDetails
    ): Promise<AuthResponse> => {
        const res = await axios.get(this.finsys_api, {
            params: {
                ...device,
                mob: "",
                usr: usr,
                pwd: pwd,
            },
        });
        return res.data;
    }
}

export const auth_service = new AuthServiceClass();